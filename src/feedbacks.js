const { combineRgb } = require("@companion-module/base");

module.exports = {
  initFeedbacks: function (mls, element_name) {
    let self = this;
    let feedbacks;
    let model;
    switch (mls) {
      case "MLS":
        feedbacks = self.feedbacks;
        model = "MLS10000";
        element_name = element_name.trim() + "_";
        break;
      case "Satellite":
        feedbacks = self.feedbacks;
        model = "SATELLITEHIGHLITE4K";
        element_name = element_name.trim() + "_";
        break;
      default:
        feedbacks = {};
        model = self.config.model.toUpperCase();
        element_name = "";
        break;
    }

    const foregroundColorWhite = combineRgb(255, 255, 255); // White
    const foregroundColorBlack = combineRgb(0, 0, 0);
    const backgroundColorRed = combineRgb(255, 0, 0); // Red
    const backgroundColorGreen = combineRgb(0, 255, 0); // Green
    const backgroundColorBlue = combineRgb(0, 0, 255); // Blue
    const backgroundColorCyan = combineRgb(0, 255, 255); // Cyan
    const backgroundColorMagenta = combineRgb(255, 0, 255); // Magenta
    const backgroundColorYellow = combineRgb(255, 255, 0); // Yellow
    const backgroundColorOrange = combineRgb(255, 165, 0); // Orange
    const PolarNight0 = combineRgb(38, 40, 46);
    const PolarNight1 = combineRgb(48, 50, 56);
    const PolarNight2 = combineRgb(58, 60, 66);
    const snow1 = combineRgb(216, 222, 233);
    const snow2 = combineRgb(229, 233, 240);
    const snow3 = combineRgb(236, 239, 244);
    const auroraRed = combineRgb(210, 82, 82);
    const auroraOrange = combineRgb(217, 154, 102);
    const auroraYellow = combineRgb(223, 194, 101);
    const auroraGreen = combineRgb(142, 192, 124);
    const auroraBlue = combineRgb(97, 175, 239);
    const auroraPurple = combineRgb(175, 152, 219);

    if (self[model]) {
      self[model].forEach((command) => {
        if (
          !command.Name.includes("xxx") &&
          command.Settings.toString().includes("?")
        ) {
          if (command.CmdStr.includes(".")) {
            command = command.CmdStr.split(".");
            if (command.length === 2) {
              let feedbackName = element_name + command[0] + "_" + command[1];
              let varName =
                "$(" + self.label + ":" + element_name + feedbackName + ")";

              feedbacks[feedbackName] = {
                type: "boolean",
                name: feedbackName,
                description: "If status is true, set the button to this color.",
                defaultStyle: {
                  color: PolarNight0,
                  bgcolor: auroraOrange,
                },
                callback: function () {
                  if (self.getVariableValue(feedbackName) === "") {
                    return true;
                  }

                  return false;
                },
              };
            } else if (command.length === 3) {
              let feedbackName =
                element_name + command[0] + "_" + command[1] + "_" + command[2];
              let varName =
                "$(" + self.label + ":" + element_name + feedbackName + ")";

              feedbacks[feedbackName] = {
                type: "boolean",
                name: feedbackName,
                description: "If status is true, set the button to this color.",
                defaultStyle: {
                  color: PolarNight0,
                  bgcolor: auroraOrange,
                },
                options: [{ value: self.getVariableValue(feedbackName) }],
                callback: ({ options }) => {
                  if (self.getVariableValue(feedbackName) === "") {
                    return true;
                  }

                  return false;
                },
              };
            }
          } else {
            let feedbackName = element_name + command.CmdStr;
            let varName =
              "$(" + self.label + ":" + element_name + feedbackName + ")";
            feedbacks[feedbackName] = {
              type: "boolean",
              name: feedbackName,
              description: "If status is true, set the button to this color.",
              defaultStyle: {
                color: PolarNight0,
                bgcolor: auroraOrange,
              },
              callback: function () {
                if (
                  self.getVariableValue(feedbackName) === "" ||
                  self.getVariableValue(feedbackName) === undefined
                ) {
                  return true;
                }

                return false;
              },
            };
          }
        }
      });
    }

    feedbacks["status"] = {
      type: "advanced",
      name: "Projector Status",
      description: "Changes button color based on projector status.",
      options: [],
      callback: function () {
        let status = self.getVariableValue("status");
        if (status !== undefined) {
          status = status.trim();
        }
        switch (status) {
          case "Standby":
            return { color: combineRgb(0xff, 0xff, 0xff), bgcolor: combineRgb(0x22, 0x22, 0x22) };
          case "Warmup":
            return { color: combineRgb(0xff, 0xff, 0x00), bgcolor: combineRgb(0x44, 0x22, 0x00) };
          case "Imaging":
            return { color: combineRgb(0x00, 0x00, 0x00), bgcolor: combineRgb(0x00, 0xff, 0x00) };
          case "Cooling":
            return { color: combineRgb(0x00, 0x00, 0x00), bgcolor: combineRgb(0x77, 0x77, 0xff) };
          case "Error":
            return { color: combineRgb(0xff, 0xff, 0xff), bgcolor: combineRgb(0xff, 0x00, 0x00) };
          default:
            return { color: combineRgb(0x00, 0x00, 0x00), bgcolor: combineRgb(0xff, 0x00, 0xff) };
        }
      },
    };

    feedbacks["On"] = {
      type: "boolean",
      name: "On",
      description:
        "For toggles including on/off choices, set the button to Green for on.",
      defaultStyle: {
        color: PolarNight0,
        bgcolor: auroraGreen,
      },
      options: [{ type: "static-text" }],

      callback: function (feedback) {
        let incValue = self.getVariableValue(feedback.options.value);

        if (incValue === "On") {
          return true;
        }
        return false;
      },
    };

    feedbacks["Off"] = {
      type: "boolean",
      name: "Off",
      description:
        "For toggles including on/off choices, set the button to Red for off.",
      defaultStyle: {
        color: snow1,
        bgcolor: auroraRed,
      },
      options: [{ type: "static-text" }],

      callback: function (feedback) {
        let incValue = self.getVariableValue(feedback.options.value);

        if (incValue === "Off") {
          return true;
        }
        return false;
      },
    };
    self.feedbacks = feedbacks;
    //self.log("debug", "feedbacks: " + JSON.stringify(feedbacks));
    self.setFeedbackDefinitions(feedbacks);
  },
};
