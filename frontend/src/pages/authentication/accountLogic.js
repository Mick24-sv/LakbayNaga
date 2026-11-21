import { useRef, useState } from "react";

export async function accountRequest(path, body) {
  const response = await fetch("/api" + path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (response.status === 204) return null;

  const data = await response.json();

  if (!response.ok) {
    const safeMessages = new Set([
      "Invalid email or password.", "An account with this email already exists.",
      "This password reset link is invalid or expired.",
      "Use a password with 12 to 128 characters.",
      "Enter first and last names, up to 60 characters each.", "Enter a valid email address.",
      "Google sign-in is not configured.", "Google sign-in is temporarily unavailable.",
      "Google sign-in could not be verified.", "Invalid JSON request.",
    ]);
    throw new Error(safeMessages.has(data.error) ? data.error : "The request could not be completed. Please try again.");
  }

  return data;
}

export async function googleLogin(credential) {
  return accountRequest('/auth/google', { credential });
}

export function useAccountForm(mode, onSuccess) {
  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setError("");
  }

  async function submit(event) {
    event.preventDefault();

    if (submitting.current) return;

    submitting.current = true;
    setBusy(true);
    setError("");

    try {
      const body =
        mode === "register"
          ? {
              firstName: values.firstName.trim(),
              lastName: values.lastName.trim(),
              email: values.email.trim(),
              password: values.password,
            }
          : {
              email: values.email.trim(),
              password: values.password,
            };

      const data = await accountRequest("/auth/" + mode, body);

      if (!data?.user) {
        throw new Error("The server did not return an account.");
      }

      onSuccess(data.user);
    } catch (err) {
      if (err.message === "Invalid email or password.") {
        setError(
          "Incorrect email or password. Check your details and try again.",
        );
      } else if (err instanceof TypeError || err instanceof SyntaxError) {
        setError("Unable to connect. Please try again shortly.");
      } else {
        setError(err.message || "The request could not be completed. Please try again.");
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return { values, update, busy, error, submit };
}
