module.exports = class SlackAttachment {
  constructor(attachment) {
    this._attachment = attachment;
    this.title = attachment.title;
    this.text = attachment.subtitle;
    this.footer = attachment.text;
    this.contentType = attachment.type;
    this.init(attachment);
  }

  init(attachment) {
    this.actions = this.getActions(attachment.buttons);
    if (attachment.type === "hero")
      this.image_url = this.getImageUrl(attachment.images);
    else if (attachment.type === "thumbnail")
      this.thumb_url = this.getImageUrl(attachment.images);
    else if (attachment.type === "file") {
      this.image_url = attachment.contentUrl;
    }
    this.callback_id = "slack_action" + new Date().getTime();
    this.id = Date.now() * Math.random();
  }

  getImageUrl(images) {
    if (images && images.length > 0) {
      return images[0].url;
    }
    return "";
  }

  getActions(actions) {
    const slackActions = [];
    actions &&
      actions.forEach((button) => {
        const slackButton = {};
        if (button.type === "imBack") {
          slackButton.name = "button";
          slackButton.value = button.value;
        } else if (button.type === "radio") {
          slackButton.name = "radio";
          slackButton.value = button.value;
        } else if (button.type === "checkbox") {
          slackButton.name = "checkbox";
          slackButton.value = button.value;
        } else if (button.type === "dropdown") {
          slackButton.name = "dropdown";
          slackButton.value = button.value;
        } else if (button.type === "openUrl") {
          slackButton.name = "link_button";
          slackButton.url = button.value;
        }
        if (Object.keys(slackButton).length > 0) {
          slackButton.text = button.title;
          slackButton.type = "button";
          slackButton.style = "primary";
          slackActions.push(slackButton);
        }
      });
    return slackActions;
  }
};
