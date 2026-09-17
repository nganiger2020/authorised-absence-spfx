import { Log } from '@microsoft/sp-core-library';
import {
  BaseApplicationCustomizer
} from '@microsoft/sp-application-base';
import { Dialog } from '@microsoft/sp-dialog';

import * as strings from 'UoBApplicationCustomizerApplicationCustomizerStrings';

const LOG_SOURCE: string = 'UoBApplicationCustomizerApplicationCustomizer';

/**
 * If your command set uses the ClientSideComponentProperties JSON input,
 * it will be deserialized into the BaseExtension.properties object.
 * You can define an interface to describe it.
 */
export interface IUoBApplicationCustomizerApplicationCustomizerProperties {
  // This is an example; replace with your own property
  testMessage: string;
}

/** A Custom Action which can be run during execution of a Client Side Application */
export default class UoBApplicationCustomizerApplicationCustomizer
  extends BaseApplicationCustomizer<IUoBApplicationCustomizerApplicationCustomizerProperties> {

  private applyCss = (cssUrl: any) => {
    try {
      const head: any = document.getElementsByTagName("head")[0] || document.documentElement;
      let customStyle: HTMLLinkElement = document.createElement("link");
      customStyle.href = cssUrl;
      customStyle.rel = "stylesheet";
      customStyle.type = "text/css";
      head.insertAdjacentElement("beforeEnd", customStyle);
    } catch (ex) {
      console.log("GB----ERROR");
      console.log(ex);
    }
  };

  public onInit(): Promise<void> {
   
    let siteAdmin = this.context.pageContext.legacyPageContext["isSiteAdmin"];
    if (window.location.href.toLowerCase().indexOf('_layouts') > -1) {
      if (!(siteAdmin)) {
        console.log('Invalid attempt to view this page, please check with SharePoint Administrator to get access');
      }
    }


    if (!siteAdmin) {
      // Create a style element to house the CSS injection rule safely
      const styleElement = document.createElement('style');
      styleElement.type = 'text/css';

      // Modern SharePoint relies on data-automation-id or specific class naming patterns
      styleElement.innerHTML = `
      div[data-automation-id="pageHeader"], 
      .ms-CommandBar, 
      [class*="commandBar"] { 
        display: none !important; 
      }
    `;

      document.head.appendChild(styleElement);

      document.querySelector('.spSiteHeader')?.setAttribute("style", "display:none !important");
      document.querySelector('#SuiteNavWrapper')?.setAttribute("style", "display:none !important");
      document.querySelector('#spSiteHeader')?.setAttribute("style", "display:none !important");
      document.querySelector('.SiteHeaderOverlay')?.setAttribute("style", "display:none !important");

    }

    setTimeout(() => {
      let settingElement: any = window.document.getElementById("HeaderButtonRegion");
      if (!siteAdmin) {
        if (settingElement)
          settingElement.style.display = "none";
      }
    }, 1000);
    return Promise.resolve();

  }

}
