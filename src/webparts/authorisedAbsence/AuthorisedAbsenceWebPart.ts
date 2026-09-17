import * as React from "react";
import * as ReactDom from "react-dom";
import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";
import { spfi, SPFI } from "@pnp/sp";
import { SPFx } from "@pnp/sp/behaviors/spfx";
import { AuthorisedAbsenceApp } from "./components/AuthorisedAbsenceApp";
import { RequestService } from "./services/RequestService";
import "./AuthorisedAbsence.css";

export interface IAuthorisedAbsenceWebPartProps { }

export default class AuthorisedAbsenceWebPart extends BaseClientSideWebPart<IAuthorisedAbsenceWebPartProps> {
  private sp!: SPFI;
  protected async onInit(): Promise<void> {
    await super.onInit();
    this.sp = spfi().using(SPFx(this.context));
  }
  public render(): void {
    ReactDom.render(React.createElement(AuthorisedAbsenceApp, { service: new RequestService(this.sp) }), this.domElement);
  }
  protected onDispose(): void { ReactDom.unmountComponentAtNode(this.domElement); }
}
