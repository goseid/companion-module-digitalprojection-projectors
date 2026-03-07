const {
  InstanceStatus,
  TCPHelper,
  // UDPHelper,
} = require("@companion-module/base");

module.exports = {
  initTcpConnection: function () {
    let self = this;
    if (self.tcpSocket !== undefined) {
      self.tcpSocket.destroy(self);
      delete self.tcpSocket;
    }

    self.initCommandQueue();
    self.updateStatus(InstanceStatus.Connecting);
    if (self.config.host && self.config.tcpPort && self.config.model !== "0") {
      self.log(
        "info",
        `Opening connection to ${self.config.host}:${self.config.tcpPort}...`
      );
      self.tcpSocket = new TCPHelper(self.config.host, self.config.tcpPort);

      self.tcpSocket.on("connect", () => {
        self.updateStatus(InstanceStatus.Ok);
        self.startInitialRequests();
      });
      self.tcpSocket.on("error", (err) => {
        self.TIMEOUTS.forEach((timeout) => {
          clearTimeout(timeout);
        });
        self.handleError(err);
      });

      self.tcpSocket.on("status_change", (status, message) => {
        self.updateStatus(status, message);
        self.log("debug", "status_change: " + status);
      });

      self.tcpSocket.on("data", (data) => {
        let incomingData = data.toString("utf8");
        self._notifyResponse();
        self.processFeedback(incomingData);
      });
    } else if (self.config.model === "0") {
      self.updateStatus(InstanceStatus.BadConfig);
      self.log("error", "No model defined");
    } else if (!self.config.host) {
      self.updateStatus(InstanceStatus.BadConfig);
      self.log("error", "No host defined");
    } else {
      self.updateStatus(InstanceStatus.BadConfig);
      self.log("error", "No tcpPort defined");
    }
  },

  handleError: function (err) {
    let self = this;

    try {
      let error = err.toString();
      let printedError = false;

      Object.keys(err).forEach(function (key) {
        if (key === "code") {
          if (err[key] === "ECONNREFUSED") {
            error =
              "Unable to communicate with Device. Connection refused. Is this the right IP address? Is it still online?";
            self.log("error", error);
            self.updateStatus(
              InstanceStatus.ConnectionFailure,
              "Connection Refused"
            );
            printedError = true;
            if (self.socket !== undefined) {
              self.socket.destroy();
            }
            self.startReconnectInterval();
          } else if (err[key] === "ETIMEDOUT") {
            error =
              "Unable to communicate with Device. Connection timed out. Is this the right IP address? Is it still online?";
            self.log("error", error);
            self.updateStatus(
              InstanceStatus.ConnectionFailure,
              "Connection Timed Out"
            );
            printedError = true;
            if (self.tcpSocket !== undefined) {
              self.tcpSocket.destroy();
            }
            self.startReconnectInterval();
          } else if (err[key] === "ECONNRESET") {
            error =
              "The connection was reset. Check the log for more error information.";
            self.log("error", error);
            self.updateStatus(
              InstanceStatus.ConnectionFailure,
              "Connection Reset"
            );
            printedError = true;
            if (self.tcpSocket !== undefined) {
              self.tcpSocket.destroy();
            }
            self.startReconnectInterval();
          }
        }
      });

      if (!printedError) {
        self.log("error", `Error: ${error}`);
      }
    } catch (error) {
      self.log("error", "Error handling error: " + error);
      self.log("error", "Error: " + String(err));
    }
  },

  startReconnectInterval: function () {
    let self = this;

    self.updateStatus(InstanceStatus.ConnectionFailure, "Reconnecting");

    if (self.RECONNECT_INTERVAL !== undefined) {
      clearInterval(self.RECONNECT_INTERVAL);
      self.RECONNECT_INTERVAL = undefined;
    }

    self.log("info", "Attempting to reconnect in 30 seconds...");

    self.RECONNECT_INTERVAL = setTimeout(
      self.initTcpConnection.bind(this),
      30000
    );
  },

  initCommandQueue: function () {
    let self = this;
    self._cmdQueue = [];
    self._cmdQueueRunning = false;
    self._cmdWaitingForResponse = false;
    self._cmdGuardTimer = null;
  },

  _processQueue: function () {
    let self = this;
    if (self._cmdQueueRunning || self._cmdQueue.length === 0) return;
    if (!self.tcpSocket || !self.tcpSocket.isConnected) return;

    self._cmdQueueRunning = true;
    let item = self._cmdQueue.shift();
    let raw = item.cmd.toString("latin1");
    let toSend = raw[0] !== "&" ? "*" + raw + "\r" : raw + "\r";

    self.tcpSocket.send(toSend, "latin1");
    self.log("debug", "queue sent: " + toSend.trim());

    if (item.priority) {
      // User commands: short guard then release immediately
      self._cmdGuardTimer = setTimeout(() => {
        self._cmdQueueRunning = false;
        self._processQueue();
      }, 200);
    } else {
      // Polling commands: wait for response or guard timeout
      self._cmdGuardTimer = setTimeout(() => {
        self._cmdQueueRunning = false;
        self._processQueue();
      }, parseInt(self.config.timeout) || 1100);
    }
  },

  _notifyResponse: function () {
    let self = this;
    if (self._cmdGuardTimer !== null) {
      clearTimeout(self._cmdGuardTimer);
      self._cmdGuardTimer = null;
    }
    self._cmdQueueRunning = false;
    self._processQueue();
  },

  sendCommand: function (cmd, prefix, self) {
    if (!self) self = this;
    let raw = cmd.toString("latin1");
    if (!self._cmdQueue) self.initCommandQueue();
    // Priority command: clear all pending polling items, insert at front
    self._cmdQueue = self._cmdQueue.filter((item) => item.priority);
    self._cmdQueue.unshift({ cmd: Buffer.from(raw, "latin1"), priority: true });
    self._processQueue();
  },
  _enqueuePollCommands: function (mls, elementName, modelChoice) {
    let self = this;
    if (!self._cmdQueue) self.initCommandQueue();
    self[modelChoice].forEach((command) => {
      if (!command.Settings.toString().includes("?")) return;
      let raw;
      if (mls !== undefined) {
        raw = "&" + elementName.trim() + "." + command.CmdStr + " ?";
      } else {
        raw = command.CmdStr + " ?";
      }
      self._cmdQueue.push({ cmd: Buffer.from(raw, "latin1"), priority: false });
    });
    self._processQueue();
  },

  startInitialRequests: function (mls, elementName) {
    let self = this;
    let modelChoice;
    switch (mls) {
      case undefined:
        modelChoice = self.config.model.toUpperCase();
        break;
      case "MLS":
        modelChoice = "MLS10000";
        break;
      case "Satellite":
        modelChoice = "SATELLITEHIGHLITE4K";
        break;
      default:
        break;
    }

    let id = self[modelChoice].length - 1;
    let interval = self.config.refresh;

    while (id >= 0) {
      if (self[modelChoice][id].Name.includes("xxx")) {
        self[modelChoice].splice(id, 1);
      }
      id--;
    }

    if (!self._cmdQueue) self.initCommandQueue();

    // Initial poll on connect
    self._enqueuePollCommands(mls, elementName, modelChoice);

    // Periodic refresh
    let pollInterval = setInterval(() => {
      if (self.tcpSocket && self.tcpSocket.isConnected) {
        self._enqueuePollCommands(mls, elementName, modelChoice);
      }
    }, parseInt(interval));
    self.TIMEOUTS.push(pollInterval);
  },

  processFeedback: function (incomingData) {
    let self = this;
    incomingData = incomingData.trim();
    self.log("debug", "incomingData: " + incomingData);
    let variableObj = {};

    let argument;
    let argumentParts;
    if (incomingData !== "") {
      let model;
      let dataArray = incomingData.trim().split("=", 2); //split the data into an array
      if (dataArray.length < 2 || !dataArray[0].split(" ")[1]) {
        self.log("warn", "skipping non-standard response: " + incomingData);
        return;
      }
      let rawArgument = dataArray[0].split(" ")[1].replace(/[\s*]/g, "");
      //let value = dataArray[1]; //get the cmdArray[1] as the value
      let subId = incomingData.indexOf("=");
      let value = incomingData.substring(subId + 1);
      if (rawArgument.includes(".")) {
        argumentParts = rawArgument.split(".");
        if (argumentParts.length === 2) {
          argument = argumentParts[0] + "_" + argumentParts[1];
        } else if (argumentParts.length === 3) {
          argument =
            argumentParts[0] + "_" + argumentParts[1] + "_" + argumentParts[2];
        }
      } else {
        argument = rawArgument;
        argumentParts = rawArgument;
      }
      let isElement =
        argumentParts[0].includes("MLS") ||
        argumentParts[0].includes("Satellite");
      switch (isElement) {
        case true:
          let isMLS = argumentParts[0].includes("MLS");
          switch (isMLS) {
            case true:
              model = "MLS10000";
              break;
            case false:
              model = "SATELLITEHIGHLITE4K";
              break;
            default:
              break;
          }
          break;
        case false:
          model = self.config.model.toUpperCase();
          break;
        default:
          break;
      }

      //let model = self.config.model.toUpperCase();
      if (self[model] !== undefined) {
        self[model].forEach((command) => {
          if (rawArgument === command.CmdStr) {
            {
              // Iterate thru keys of command object to list keys starting with "data"
              let list = this.createList(command);
              //Search for "dropdownList" commands
              if (list.length > 0) {
                if (list[parseInt(value)]) {
                  if (list.length === 2 && list[0].label === "Off") {
                    variableObj[argument] = list[parseInt(value)].label;
                    self.setVariableValues(variableObj);
                    self.checkFeedbacks(argument);
                    self.checkFeedbacks("On");
                    self.checkFeedbacks("Off");
                  } else {
                    variableObj[argument] = list[parseInt(value)].label;
                    self.setVariableValues(variableObj);
                    self.checkFeedbacks(argument);
                  }
                } else {
                  variableObj[argument] = value;
                  self.setVariableValues(variableObj);
                  self.checkFeedbacks(argument);
                }
              } else {
                variableObj[argument] = value;
                self.setVariableValues(variableObj);
                self.checkFeedbacks(argument);
              }
            }
          } else if (
            rawArgument.includes(".") &&
            argumentParts.slice(1).join(".") === command.CmdStr
          ) {
            ///MLS Parts///
            // Iterate thru keys of command object to list keys starting with "data"
            let list = this.createList(command);
            //Search for "dropdownList" commands
            if (list.length > 0) {
              if (list[parseInt(value)]) {
                if (list.length === 2 && list[0].label === "Off") {
                  variableObj[argument] = list[parseInt(value)].label;
                  self.setVariableValues(variableObj);
                  self.checkFeedbacks(argument);
                  self.checkFeedbacks("On");
                  self.checkFeedbacks("Off");
                } else {
                  variableObj[argument] = list[parseInt(value)].label;
                  self.setVariableValues(variableObj);
                  self.checkFeedbacks(argument);
                }
              } else {
                variableObj[argument] = value;
                self.setVariableValues(variableObj);
                self.checkFeedbacks(argument);
              }
            } else {
              variableObj[argument] = value;
              self.setVariableValues(variableObj);
              self.checkFeedbacks(argument);
            }
          }
        });
      }
      //Update last TCP response variable
      variableObj["tcp_response"] = incomingData;
    }

    /// MLS relative operations ///

    if (incomingData.includes("inventory")) {
      if (incomingData.includes("inventory.count")) {
        let dataArray = incomingData.trim().split("=", 2);
        if (self.mls_elements_count) {
          self.log(
            "debug",
            "self.mls_elements_count: " + self.mls_elements_count
          );
          if (self.mls_elements_count !== dataArray[1]) {
            self.mls_elements_count = dataArray[1];
            self.requestName(self.mls_elements_count);
          }
        } else {
          self.mls_elements_count = dataArray[1];
          self.requestName(self.mls_elements_count);
        }
      }
      if (incomingData.includes("inventory.name")) {
        let dataArray = incomingData.trim().split("=", 2);
        if (dataArray[1].includes("Satellite")) {
          self.log("debug", "Satellite's name: " + dataArray[1]);
          self.startInitialRequests("Satellite", dataArray[1]);
          self.initVariables("Satellite", dataArray[1]);
          self.initFeedbacks("Satellite", dataArray[1]);
          self.initActions("Satellite", dataArray[1]);
          self.initPresets("Satellite", dataArray[1]);
        } else if (dataArray[1].includes("MLS")) {
          self.log("debug", "MLS's name: " + dataArray[1]);
          self.startInitialRequests("MLS", dataArray[1]);
          self.initVariables("MLS", dataArray[1]);
          self.initFeedbacks("MLS", dataArray[1]);
          self.initActions("MLS", dataArray[1]);
          self.initPresets("MLS", dataArray[1]);
        }
      }
    }
  },

  reduceModel: function (model, self) {
    let reducedModel = [];
    if (self[model] !== undefined) {
      reducedModel = self[model].filter((command) => {
        if (
          (!command.Name.includes("xxx") && command.Name !== "") ||
          (command.CmdStr === "" && command.Value !== "")
        ) {
          return true; // Keep this object
        } else {
          return false; // Don't keep this object
        }
      });
      return reducedModel;
    }
    self.log("debug", "model not found: " + model);
  },

  createList: function (command) {
    // Iterate thru keys of command object to list keys starting with "data"
    let dataKeys = [];
    let previousDataValueWasEmpty = true;
    let list = [];
    dataKeys = Object.keys(command).filter((key) => key.startsWith("data"));
    for (let i = dataKeys.length - 1; i >= 0; i--) {
      let dataKey = dataKeys[i];
      let dataValue = command[dataKey];
      if (dataValue !== "") {
        list[i] = { id: i, label: dataValue };
        previousDataValueWasEmpty = false;
      } else if (!previousDataValueWasEmpty) {
        list[i] = { id: i, label: "" };
        previousDataValueWasEmpty = true;
      }
    }
    return list;
  },
};
