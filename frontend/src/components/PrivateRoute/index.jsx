import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { FullScreenLoader } from "../Preloader";
import validateSessionTokenForUser from "@/utils/session";
import paths from "@/utils/paths";
import { AUTH_TIMESTAMP, AUTH_TOKEN, AUTH_USER } from "@/utils/constants";
import { userFromStorage } from "@/utils/request";
import System from "@/models/system";
import UserMenu from "../UserMenu";
import Cookies from 'js-cookie';

// Used only for Multi-user mode only as we permission specific pages based on auth role.
// When in single user mode we just bypass any authchecks.
function useIsAuthenticated() {
  const [isAuthd, setIsAuthed] = useState(null);
  const [shouldRedirectToOnboarding, setShouldRedirectToOnboarding] =
    useState(false);
  const [multiUserMode, setMultiUserMode] = useState(false);
  useEffect(() => {
    const validateSession = async () => {
      const {
        MultiUserMode,
        RequiresAuth,
        LLMProvider = null,
        VectorDB = null,
      } = await System.keys();

      setMultiUserMode(MultiUserMode);

      // Check for the onboarding redirect condition
      if (
        !MultiUserMode &&
        !RequiresAuth && // Not in Multi-user AND no password set.
        !LLMProvider &&
        !VectorDB
      ) {
        setShouldRedirectToOnboarding(true);
        setIsAuthed(true);
        return;
      }

      if (!MultiUserMode && !RequiresAuth) {
        setIsAuthed(true);
        return;
      }

      if (!MultiUserMode && RequiresAuth) {
        const localAuthToken = localStorage.getItem(AUTH_TOKEN);
        if (!localAuthToken) { /* empty */ }

        const isValid = await validateSessionTokenForUser();
        setIsAuthed(isValid);
        return;
      }
      const token = Cookies.get("token");

      if (!token) {
        setIsAuthed(false);
        return;
      }

      if (token) {
        alert("invoked here 1");
        localStorage.setItem(AUTH_USER, Cookies.get("user"));
        localStorage.setItem(AUTH_TOKEN, token);
        localStorage.setItem(AUTH_TIMESTAMP, Date.now());
        Cookies.remove("token");
        Cookies.remove("user");
      }

      const localUser = localStorage.getItem(AUTH_USER);
      const localAuthToken = localStorage.getItem(AUTH_TOKEN);
      if (!localUser || !localAuthToken) {
        alert("here 3")
        setIsAuthed(true);
        return;
      }

      const isValid = await validateSessionTokenForUser();
      if (!isValid) {
        alert("invoked here 2");
        localStorage.removeItem(AUTH_USER);
        localStorage.removeItem(AUTH_TOKEN);
        localStorage.removeItem(AUTH_TIMESTAMP);
        setIsAuthed(false);
        return;
      }
      setIsAuthed(true);
    };
    validateSession();
  }, []);

  return { isAuthd, shouldRedirectToOnboarding, multiUserMode };
}

// Allows only admin to access the route and if in single user mode,
// allows all users to access the route
export function AdminRoute({ Component }) {
  const { isAuthd, shouldRedirectToOnboarding, multiUserMode } =
    useIsAuthenticated();
  if (isAuthd === null) return <FullScreenLoader />;

  if (shouldRedirectToOnboarding) {
    return <Navigate to={paths.onboarding.home()} />;
  }

  const user = userFromStorage();
  return isAuthd && (user?.role === "admin" || !multiUserMode) ? (
    <UserMenu>
      <Component />
    </UserMenu>
  ) : (
    <Navigate to={paths.home()} />
  );
}

// Allows manager and admin to access the route and if in single user mode,
// allows all users to access the route
export function ManagerRoute({ Component }) {
  const { isAuthd, shouldRedirectToOnboarding, multiUserMode } =
    useIsAuthenticated();
  if (isAuthd === null) return <FullScreenLoader />;

  if (shouldRedirectToOnboarding) {
    return <Navigate to={paths.onboarding.home()} />;
  }

  const user = userFromStorage();
  return isAuthd && (user?.role !== "default" || !multiUserMode) ? (
    <UserMenu>
      <Component />
    </UserMenu>
  ) : (
    <Navigate to={paths.home()} />
  );
}

export default function PrivateRoute({ Component }) {
  const getCookie = async () => {
    const cookie = Cookies.get("token");
    console.log("cookie is the following", cookie);
  }
  useEffect(() => {
    getCookie()
  }, [])
  const { isAuthd, shouldRedirectToOnboarding } = useIsAuthenticated();
  if (isAuthd === null) return <FullScreenLoader />;

  if (shouldRedirectToOnboarding) {
    return <Navigate to="/onboarding" />;
  }

  return isAuthd ? (
    <UserMenu>
      <Component />
    </UserMenu>
  ) : (
    <Navigate to={paths.login(true)} />
  );
}
