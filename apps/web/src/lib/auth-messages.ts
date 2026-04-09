export type RegisterErrorResponse = {
  code?: string;
  error?: string;
} | null;

function formatRetryDelay(seconds: number) {
  if (seconds >= 120) return `${Math.ceil(seconds / 60)} minutes`;
  if (seconds >= 60) return "about 1 minute";
  return `${seconds} seconds`;
}

export function getSignInErrorMessage(error: string) {
  const [code, retryAfterRaw] = error.split(":");
  const retryAfterSeconds = Number(retryAfterRaw ?? "");

  switch (error) {
    case "InvalidCredentials":
    case "CredentialsSignin":
      return "Incorrect email or password.";
    case "TOTPRequired":
      return "Enter your 6-digit authenticator code to sign in.";
    case "TOTPInvalid":
      return "Invalid authenticator code. Try again.";
    case "OAuthSignin":
    case "OAuthCallback":
      return "Google sign-in failed. Check your Google OAuth configuration.";
    case "OAuthAccountNotLinked":
      return "This email is linked to another sign-in method. Use email + password for this account.";
    case "GoogleEmailNotVerified":
      return "Google sign-in requires a verified Google email address.";
    case "Configuration":
      return "Sign-in is not configured correctly on the server.";
    case "ManagerEmailOnly":
      return "Manager accounts must sign in with email + password (and authenticator code if enabled).";
  }

  switch (code) {
    case "TooManyAttempts":
      return Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? `Too many sign-in attempts. Please wait ${formatRetryDelay(retryAfterSeconds)} and try again.`
        : "Too many sign-in attempts. Please wait a moment and try again.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

export function getRegisterErrorMessage(result: RegisterErrorResponse) {
  if (!result) return "Could not create account. Please try again.";

  switch (result.code) {
    case "InvalidEmail":
      return "Enter a valid email address.";
    case "InvalidPassword":
      return typeof result.error === "string" && result.error.trim() ? result.error : "Password must be at least 12 characters.";
    case "SignInInstead":
      return "We couldn't create that account. Sign in instead if you already have one.";
    case "TooManyRequests":
      return "Too many sign-up attempts. Please wait a moment and try again.";
    default:
      return typeof result.error === "string" && result.error.trim() ? result.error : "Could not create account. Please try again.";
  }
}
