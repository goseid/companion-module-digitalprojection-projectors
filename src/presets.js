const { combineRgb } = require("@companion-module/base");
const actions = require("./actions");
const variables = require("./variables");
const feedbacks = require("./feedbacks");
const { reduceModel, createList } = require("./utils");

module.exports = {
  initPresets: function (mls, element_name) {
    let self = this;
    let presets;
    let model;
    switch (mls) {
      case "MLS":
        element_name = element_name.trim() + "_";
        presets = self.presets;
        model = "MLS10000";
        break;
      case "Satellite":
        element_name = element_name.trim() + "_";
        presets = self.presets;
        model = "SATELLITEHIGHLITE4K";
        break;
      default:
        element_name = "";
        presets = [];
        model = self.config.model.toUpperCase();
        break;
    }

    const foregroundColorWhite = combineRgb(255, 255, 255); // White
    const foregroundColorBlack = combineRgb(0, 0, 0); // Black
    const backgroundColorRed = combineRgb(255, 0, 0); // Red
    const backgroundColorGreen = combineRgb(0, 255, 0); // Green
    const backgroundColorBlue = combineRgb(0, 0, 255); // Blue
    const backgroundColorCyan = combineRgb(0, 255, 255); // Cyan
    const backgroundColorMagenta = combineRgb(255, 0, 255); // Magenta
    const backgroundColorYellow = combineRgb(255, 255, 0); // Yellow
    const backgroundColorOrange = combineRgb(255, 165, 0); // Orange
    const PolarNight0 = combineRgb(38, 40, 46); // Black
    const PolarNight1 = combineRgb(48, 50, 56); // Gray
    const PolarNight2 = combineRgb(58, 60, 66); // Light Gray
    const snow1 = combineRgb(216, 222, 233); // White
    const snow2 = combineRgb(229, 233, 240); // Light Gray
    const snow3 = combineRgb(236, 239, 244); // Gray
    const auroraRed = combineRgb(210, 82, 82); // Red
    const auroraOrange = combineRgb(217, 154, 102); // Orange
    const auroraYellow = combineRgb(223, 194, 101);
    const auroraGreen = combineRgb(142, 192, 124);
    const auroraBlue = combineRgb(97, 175, 239);
    const auroraPurple = combineRgb(175, 152, 219);

    let instanceId = self.label;

    // Power preset with status feedback
    presets.push({
      type: "button",
      category: element_name + "Control - ToggleList",
      name: element_name + "Power",
      style: {
        text: "Proj\\nPower\\n$(" + instanceId + ":" + element_name + "status)",
        size: "14",
        color: combineRgb(0xff, 0xff, 0xff),
        bgcolor: combineRgb(0x22, 0x22, 0x22),
      },
      steps: [
        {
          down: [],
          up: [
            {
              actionId: element_name + "Power On",
            },
          ],
          2000: [
            {
              actionId: element_name + "Power Off",
            },
          ],
        },
      ],
      feedbacks: [
        {
          feedbackId: "status",
        },
      ],
    });

    let reducedModel = reduceModel(model, self);
    if (reducedModel) {
      reducedModel.forEach((command) => {
        let variableId = "";
        if (command.Settings.toString().includes("?")) {
          if (command.CmdStr.includes(".")) {
            variableId = command.CmdStr.split(".");
            if (variableId.length === 2) {
              variableId = element_name + variableId[0] + "_" + variableId[1];
            } else if (variableId.length === 3) {
              variableId =
                element_name +
                variableId[0] +
                "_" +
                variableId[1] +
                "_" +
                variableId[2];
            }
          } else {
            variableId = element_name + command.CmdStr;
          }
          if (variableId !== "") {
            if (command.Settings.toString().includes("?")) {
              //Search for "dropdown" commands
              let list = createList(command);
              if (list.length > 0) {
                //DropdownList presets
                if (list.length !== 2) {
                  let key = "id_" + element_name + command.Name;
                  presets.push({
                    type: "button",
                    category: element_name + command.Category + " - ChoiceList",
                    name: element_name + command.Name,
                    style: {
                      text:
                        "concat('" +
                        command.Name +
                        ": ' ,$(" +
                        instanceId +
                        ":" +
                        variableId +
                        "))",
                      textExpression: true,
                      size: "14",
                      color: PolarNight0,
                      bgcolor: auroraPurple,
                    },
                    steps: [
                      {
                        down: [
                          {
                            actionId: element_name + command.Name,
                            options: {
                              [key]: list[0].id,
                            },
                          },
                        ],
                        up: [],
                      },
                    ],
                    feedbacks: [
                      {
                        feedbackId: variableId,
                        style: {
                          color: PolarNight0,
                          bgcolor: backgroundColorOrange,
                        },
                        options: [{ value: self.getVariableValue(variableId) }],
                      },
                    ],
                  });
                }
                //ON/OFF Toggle presets
                else if (list[0].label === "Off" && list[1].label === "On") {
                  {
                    let key = "id_" + element_name + command.Name;
                    presets.push({
                      type: "button",
                      category:
                        element_name + command.Category + " - ToggleList",
                      name: element_name + command.Name,
                      style: {
                        text:
                          "concat('" +
                          command.Name +
                          ": ' ,$(" +
                          instanceId +
                          ":" +
                          variableId +
                          "))",
                        textExpression: true,
                        size: "14",
                        color: PolarNight0,
                        bgcolor: backgroundColorOrange,
                      },
                      steps: [
                        {
                          down: [
                            {
                              actionId: element_name + command.Name,
                              options: {
                                [key]: list[0].id,
                              },
                            },
                          ],
                          up: [],
                        },
                        {
                          down: [
                            {
                              actionId: element_name + command.Name,
                              options: {
                                [key]: list[1].id,
                              },
                            },
                          ],
                          up: [],
                        },
                      ],
                      feedbacks: [
                        {
                          feedbackId: "On",
                          style: {
                            color: PolarNight0,
                            bgcolor: auroraGreen,
                          },
                          options: {
                            value: variableId,
                          },
                        },
                        {
                          feedbackId: "Off",
                          style: {
                            color: snow1,
                            bgcolor: auroraRed,
                          },
                          options: {
                            value: variableId,
                          },
                        },
                      ],
                    });
                  }
                }
                //Generic Toggle presets
                else {
                  {
                    for (element in list) {
                    }

                    let key = "id_" + element_name + command.Name;
                    presets.push({
                      type: "button",
                      category:
                        element_name + command.Category + " - ToggleList",
                      name: element_name + command.Name,
                      style: {
                        text:
                          "concat('" +
                          command.Name +
                          ": ' ,$(" +
                          instanceId +
                          ":" +
                          variableId +
                          "))",
                        textExpression: true,
                        size: "14",
                        color: foregroundColorBlack,
                        bgcolor: backgroundColorCyan,
                      },
                      steps: [
                        {
                          down: [
                            {
                              actionId: element_name + command.Name,
                              options: {
                                [key]: list[0].id,
                              },
                            },
                          ],
                          up: [],
                        },
                        {
                          down: [
                            {
                              actionId: element_name + command.Name,
                              options: {
                                [key]: list[1].id,
                              },
                            },
                          ],
                          up: [],
                        },
                      ],
                      feedbacks: [
                        {
                          feedbackId: variableId,
                          style: {
                            color: PolarNight0,
                            bgcolor: backgroundColorOrange,
                          },
                          options: [
                            { value: self.getVariableValue(variableId) },
                          ],
                        },
                      ],
                    });
                  }
                }
              }
              //Value presets
              else if (
                command.Settings.includes("?=+-") &&
                command.min !== "" &&
                command.max !== "" &&
                command.Name !== ""
              ) {
                presets.push({
                  type: "button",
                  category: element_name + command.Category + " - Value",
                  name: element_name + command.Name,
                  style: {
                    text:
                      "concat('" +
                      command.Name +
                      ": ' ,$(" +
                      instanceId +
                      ":" +
                      variableId +
                      "))",
                    textExpression: true,
                    size: "14",
                    color: PolarNight0,
                    bgcolor: auroraBlue,
                  },
                  steps: [
                    {
                      down: [
                        {
                          actionId: element_name + command.Name,
                        },
                      ],
                      up: [],
                    },
                  ],
                  feedbacks: [
                    {
                      feedbackId: variableId,
                      style: {
                        color: PolarNight0,
                        bgcolor: backgroundColorOrange,
                      },
                      options: [{ value: self.getVariableValue(variableId) }],
                    },
                  ],
                });
              }
            }
            //Simple Execute presets
            else if (command.Settings === "") {
              presets.push({
                type: "button",
                category: element_name + command.Category + " - Execute",
                name: element_name + command.Name,
                style: {
                  text:
                    "concat('" +
                    command.Name +
                    ": ' ,$(" +
                    instanceId +
                    ":" +
                    variableId +
                    "))",
                  textExpression: true,
                  size: "14",
                  color: PolarNight0,
                  bgcolor: auroraBlue,
                },
                steps: [
                  {
                    down: [
                      {
                        actionId: element_name + command.Name,
                      },
                    ],
                    up: [],
                  },
                ],
                feedbacks: [
                  {
                    feedbackId: variableId,
                    style: {
                      color: PolarNight0,
                      bgcolor: backgroundColorOrange,
                    },
                    options: [{ value: self.getVariableValue(variableId) }],
                  },
                ],
              });
            }
          }
        }
        //Others Execute Preset
        else if (command.Settings === "") {
          presets.push({
            type: "button",
            category: element_name + command.Category + " - Execute",
            name: element_name + command.Name,
            style: {
              text: command.Name,
              size: "14",
              color: foregroundColorBlack,
              bgcolor: backgroundColorMagenta,
            },
            steps: [
              {
                down: [
                  {
                    actionId: element_name + command.Name,
                  },
                ],
                up: [],
              },
            ],
          });
        }
      });
    }
    self.presets = presets;
    self.setPresetDefinitions(presets);
  },
};
