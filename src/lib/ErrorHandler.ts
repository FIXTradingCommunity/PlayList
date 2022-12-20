import * as Sentry from '@sentry/browser';
import { IDecodedUserData } from '../components/App';

export default class ErrorHandler {
  private static instance: ErrorHandler;
  private SENTRY_DNS_KEY = "https://de40e3ceeeda4e5aadcd414b588c3428@sentry.io/5747100";
  
  private constructor() {
    Sentry.init({ dsn: this.SENTRY_DNS_KEY });
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
}

  public configureScope = (userData: IDecodedUserData) =>
    Sentry.configureScope((scope) => {
      scope.setUser({
        Employer: userData.Employer,
        email: userData.email,
        firstname: userData.firstname,
        groups: userData.groups,
        lastname: userData.lastname,
        sub: userData.sub,
      });
    });
  
  public captureException = (error: any) => {
    if (error) {
      return Sentry.captureException(error)
    }
    return;
  }
}
