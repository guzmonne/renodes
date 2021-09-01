export class HtmlSanitizer {
  tagWhitelist_ = {
    "DEL": true, "INPUT": true,
    "A": true, "ABBR": true, "B": true, "BLOCKQUOTE": true, "BODY": true, "BR": true, "CENTER": true, "CODE": true, "DIV": true, "EM": true, "FONT": true,
    "H1": true, "H2": true, "H3": true, "H4": true, "H5": true, "H6": true, "HR": true, "I": true, "IMG": true, "LABEL": true, "LI": true, "OL": true, "P": true, "PRE": true,
    "SMALL": true, "SOURCE": true, "SPAN": true, "STRONG": true, "TABLE": true, "TBODY": true, "TR": true, "TD": true, "TH": true, "THEAD": true, "UL": true, "U": true, "VIDEO": true
  }

  contentTagWhiteList_ = { "FORM": true } //tags that will be converted to DIVs

  attributeWhitelist_ = { "disabled": true, "checked": true, "align": true, "color": true, "controls": true, "height": true, "href": true, "src": true, "style": true, "target": true, "title": true, "type": true, "width": true }

  cssWhitelist_ = { "color": true, "background-color": true, "font-size": true, "text-align": true, "text-decoration": true, "font-weight": true }

  schemaWhiteList_ = ["http:", "https:", "data:", "m-files:", "file:", "ftp:"] //which "protocols" are allowed in "href", "src" etc

  uriAttributes_ = { "href": true, "action": true }

  constructor() {
    this.sanitize.bind(this)
    this.startsWithAny.bind(this)
  }

  sanitize(input: string): string {
    input = input.trim()
    if (input == "") return "" //to save performance and not create iframe

    //firefox "bogus node" workaround
    if (input == "<br>") return ""

    var iframe = document.createElement("iframe")
    if (iframe["sandbox"] === undefined) {
      alert("Your browser does not support sandboxed iframes. Please upgrade to a modern browser.")
      return ""
    }
    iframe.setAttribute("sandbox", "allow-same-origin")
    iframe.style.display = "none"
    document.body.appendChild(iframe) // necessary so the iframe contains a document
    var iframedoc = iframe.contentDocument || iframe.contentWindow.document
    if (iframedoc.body == null) iframedoc.write("<body></body>") // null in IE
    iframedoc.body.innerHTML = input

    const makeSanitizedCopy = (node) => {
      if (node.nodeType == Node.TEXT_NODE) {
        var newNode = node.cloneNode(true)
      } else if (node.nodeType == Node.ELEMENT_NODE && (this.tagWhitelist_[node.tagName] || this.contentTagWhiteList_[node.tagName])) {

        //remove useless empty spans (lots of those when pasting from MS Outlook)
        if ((node.tagName == "SPAN" || node.tagName == "B" || node.tagName == "I" || node.tagName == "U")
          && node.innerHTML.trim() == "") {
          return document.createDocumentFragment()
        }

        if (this.contentTagWhiteList_[node.tagName])
          newNode = iframedoc.createElement("DIV") //convert to DIV
        else
          newNode = iframedoc.createElement(node.tagName)

        for (var i = 0; i < node.attributes.length; i++) {
          var attr = node.attributes[i]
          if (this.attributeWhitelist_[attr.name]) {
            if (attr.name == "style") {
              for (var s = 0; s < node.style.length; s++) {
                var styleName = node.style[s]
                if (this.cssWhitelist_[styleName])
                  newNode.style.setProperty(styleName, node.style.getPropertyValue(styleName))
              }
            }
            else {
              if (this.uriAttributes_[attr.name]) { //if this is a "uri" attribute, that can have "javascript:" or something
                if (attr.value.indexOf(":") > -1 && !this.startsWithAny(attr.value, this.schemaWhiteList_))
                  continue
              }
              newNode.setAttribute(attr.name, attr.value)
            }
          }
        }
        for (i = 0; i < node.childNodes.length; i++) {
          var subCopy = makeSanitizedCopy(node.childNodes[i])
          newNode.appendChild(subCopy, false)
        }
      } else {
        newNode = document.createDocumentFragment()
      }
      return newNode
    }

    var resultElement = makeSanitizedCopy(iframedoc.body)
    document.body.removeChild(iframe)
    return resultElement.innerHTML
      .replace(/<br[^>]*>(\S)/g, "<br>\n$1")
      .replace(/div><div/g, "div>\n<div") //replace is just for cleaner code
  }

  startsWithAny(str: string, substrings: string[]) {
    for (var i = 0; i < substrings.length; i++) {
      if (str.indexOf(substrings[i]) == 0) {
        return true;
      }
    }
    return false;
  }
}

export const htmlSanitizer = new HtmlSanitizer()