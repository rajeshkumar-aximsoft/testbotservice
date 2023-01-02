module.exports = class FBAttachment {
  constructor() {
    this.type = "template";
    this.payload = {
      template_type: "generic"
    };
  }

  addElement(attachment) {

    const buttonLength = (attachment.buttons || []).length;
    const carouselLength =
      buttonLength <= 3 ? 1 : Math.ceil((attachment.buttons || []).length / 3);

    let imageUrl = null;
    if (attachment.type === "hero" || attachment.type === "thumbnail")
      imageUrl = this.getImageUrl(attachment.images);
    else if (attachment.type === "file") {
      imageUrl = attachment.contentUrl;
    }

    
      if(!this.payload.elements) this.payload.elements = [];
      for (let i = 0; i < carouselLength; i++) {
        const element = {};
        if(attachment.title) element.title = attachment.title;
        if(attachment.subtitle) element.subtitle = attachment.subtitle;
        if(imageUrl) element.image_url = imageUrl;
        const buttonActions = this.getButtonActions(attachment.buttons.slice(i * 3, (i + 1) * 3));
        if(buttonActions.length > 0) element.buttons = buttonActions;
        if(!attachment.title && !attachment.subtitle && !imageUrl) {
          element.title = 'Choose an option';
        }
        if(Object.keys(element).length > 0) this.payload.elements.push(element);
      }
  }

  getImageUrl(images) {
    if (images && images.length > 0) {
      return images[0].url;
    }
    return "";
  }

  getButtonActions(buttons) {
    const buttonActions = [];
    buttons.forEach((button) => {
      const buttonAction = {
        title: button.title,
      };
      if (button.type === "imBack") {
        buttonAction.type = "postback";
        buttonAction.payload = button.value;
      } else if (button.type === "openUrl") {
        buttonAction.type = "web_url";
        buttonAction.url = button.value;
        buttonAction.webview_height_ratio = "full";
      }
      buttonActions.push(buttonAction);
    });
    return buttonActions;
  }
};
