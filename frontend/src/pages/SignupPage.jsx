import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../api/api";
import "../styles/Auth.css"; // Shared styles for login/signup

const SignupPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if user is already logged in
  if (localStorage.getItem("adyaai_token")) {
    navigate("/", { replace: true });
    return null; // Render nothing while redirecting
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // The age from the form is a string, convert it to a number for the API
      await signup(name, email, password, Number(age));
      // On success, redirect to the login page to sign in
      navigate("/login");
    } catch (err) {
      // Check if the backend sent a specific error message
      if (
        err.response &&
        err.response.data &&
        typeof err.response.data === "string"
      ) {
        setError(err.response.data);
      } else {
        setError("Signup failed. Please try again.");
      }
      console.error("Signup error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create an Account</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="6"
            autoComplete="new-password"
          />
          <input
            type="number"
            placeholder="Age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
          {error && <div className="auth-error">{error}</div>}
        </form>
        <div className="auth-link">
          <Link to="/login">Already have an account? Login</Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
