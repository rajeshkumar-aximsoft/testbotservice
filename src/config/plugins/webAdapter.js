const { WebAdapter } = require("botbuilder-adapter-web");
const { ActivityTypes, TurnContext } = require("botbuilder");
const WebSocket = require("ws");
const clients = {};

exports.ReplybotWebAdapter = class ReplybotWebAdapter extends WebAdapter {
  constructor(socketServerOptions) {
    super(socketServerOptions);
    this.messageMiddlewares = [];
  }

  useMessage(middleware) {
    if (typeof middleware === "function") {
      this.messageMiddlewares.push(middleware);
    }
  }

  createSocketServer(server, socketOptions = {}, logic) {
    this.wss = new WebSocket.Server(Object.assign({ server }, socketOptions));
    function heartbeat() {
      this.isAlive = true;
    }
    this.wss.on("connection", (ws) => {
      ws.isAlive = true;
      ws.on("pong", heartbeat);

      ws.on("message", (payload) => {
        try {
          const message = JSON.parse(payload);

          const isValid = this.messageMiddlewares.every((middleware) =>
            middleware(ws, message)
          );
          if (!isValid) return;

          // note the websocket connection for this user
          ws.user = message.user;
          clients[message.user] = ws;

          // this stuff normally lives inside Botkit.congfigureWebhookEndpoint
          const activity = {
            timestamp: new Date(),
            channelId: "websocket",
            conversation: {
              id: message.user,
            },
            from: {
              id: message.user,
            },
            recipient: {
              id: "bot",
            },
            channelData: message,
            text: message.text,
            type:
              message.type === "message"
                ? ActivityTypes.Message
                : ActivityTypes.Event,
          };
          // set botkit's event type
          if (activity.type !== ActivityTypes.Message) {
            activity.channelData.botkitEventType = message.type;
          }
          const context = new TurnContext(this, activity);
          this.runMiddleware(context, logic).catch((err) => {
            console.error(err.toString());
          });
        } catch (e) {
          const alert = [
            "Error parsing incoming message from websocket.",
            "Message must be JSON, and should be in the format documented here:",
            "https://botkit.ai/docs/readme-web.html#message-objects",
          ];
          console.error(alert.join("\n"));
          console.error(e);
        }
      });
      ws.on("error", (err) => console.error("Websocket Error: ", err));
      ws.on("close", function () {
        delete clients[ws.user];
      });
    });
    setInterval(() => {
      this.wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping("", false, () => {
          // noop
        });
      });
    }, 30000);
  }

  async sendActivities(context, activities) {
    const responses = [];
    for (let a = 0; a < activities.length; a++) {
      const activity = activities[a];

      const message = this.activityToMessage(activity);

      const channel = context.activity.channelId;

      if (channel === "websocket") {
        // If this turn originated with a websocket message, respond via websocket
        const ws = clients[activity.recipient.id];
        if (ws && ws.readyState === 1) {
          try {
            ws.send(JSON.stringify(message));
          } catch (err) {
            console.error(err);
          }
        } else {
          console.error("Could not send message, no open websocket found");
        }
      } else if (channel === "webhook") {
        // if this turn originated with a webhook event, enqueue the response to be sent via the http response
        let outbound = context.turnState.get("httpBody");
        if (!outbound) {
          outbound = [];
        }
        outbound.push(message);
        context.turnState.set("httpBody", outbound);
      }
    }

    return responses;
  }
};
