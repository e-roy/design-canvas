import {
  Auth,
  AuthProvider,
  browserPopupRedirectResolver,
  signInWithPopup,
  UserCredential,
} from "firebase/auth";

export const loginWithProvider = async (
  auth: Auth,
  provider: AuthProvider
): Promise<UserCredential> => {
  const result = await signInWithPopup(
    auth,
    provider,
    browserPopupRedirectResolver
  );

  return result;
};

export async function loginWithCredential(credential: UserCredential) {
  const idToken = await credential.user.getIdToken();

  await login(idToken);
}

export async function login(token: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  await fetch("/api/login", {
    method: "GET",
    headers,
  });
}

export async function logout() {
  const headers: Record<string, string> = {};

  await fetch("/api/logout", {
    method: "GET",
    headers,
  });
}
