(function () {
  const TOKEN_KEY = "vibeGamingToken";
  const USER_KEY = "vibeGamingUser";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  function isHomePage() {
    const page = window.location.pathname.split("/").pop().toLowerCase();
    return page === "" || page === "index.html";
  }

  function setLogin(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearLogin() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function isLoggedIn() {
    return Boolean(getToken() && getUser());
  }

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;

    try {
      response = await fetch(path, { ...options, headers });
    } catch (error) {
      throw new Error("Open the project from http://localhost:3000 so login and scores can use the backend.");
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong.");
    }

    return data;
  }

  async function logout() {
    try {
      await api("/api/logout", { method: "POST", body: "{}" });
    } catch (error) {
      // Local logout still helps when a session has expired.
    }

    clearLogin();
    renderBar();
    window.dispatchEvent(new CustomEvent("vibe:logout"));
  }

  function ensureStyles() {
    if (document.getElementById("vibe-auth-styles")) return;

    const style = document.createElement("style");
    style.id = "vibe-auth-styles";
    style.textContent = `
      .vibe-auth-bar {
        align-items: center;
        background: rgba(0, 0, 0, 0.72);
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 8px;
        color: white;
        display: flex;
        gap: 10px;
        font: 14px Arial, sans-serif;
        padding: 8px 10px;
        position: fixed;
        right: 14px;
        top: 14px;
        z-index: 1000;
      }

      .vibe-auth-bar button,
      .vibe-auth-modal button {
        background: #00ffc8;
        border: 0;
        border-radius: 6px;
        color: #06120f;
        cursor: pointer;
        font-weight: 700;
        padding: 8px 12px;
      }

      .vibe-auth-modal {
        align-items: center;
        background: rgba(0, 0, 0, 0.78);
        display: none;
        inset: 0;
        justify-content: center;
        padding: 18px;
        position: fixed;
        z-index: 2000;
      }

      .vibe-auth-modal.open {
        display: flex;
      }

      .vibe-auth-card {
        background: #10151f;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        box-shadow: 0 16px 60px rgba(0, 0, 0, 0.45);
        color: white;
        max-width: 380px;
        padding: 22px;
        position: relative;
        width: min(100%, 380px);
      }

      .vibe-auth-close {
        align-items: center;
        background: transparent !important;
        border: 1px solid rgba(255, 255, 255, 0.35) !important;
        border-radius: 50% !important;
        box-shadow: none !important;
        color: white !important;
        display: flex;
        font-size: 20px;
        height: 34px;
        justify-content: center;
        line-height: 1;
        padding: 0 !important;
        position: absolute;
        right: 12px;
        top: 12px;
        width: 34px;
      }

      .vibe-auth-card h2 {
        font: 700 24px Arial, sans-serif;
        margin: 0 0 8px;
      }

      .vibe-auth-card p {
        color: #cfd6e4;
        font: 15px/1.45 Arial, sans-serif;
        margin: 0 0 16px;
      }

      .vibe-auth-card label {
        display: block;
        font: 700 13px Arial, sans-serif;
        margin: 12px 0 6px;
      }

      .vibe-auth-card input {
        background: #f7fbff;
        border: 1px solid #d7e0ea;
        border-radius: 6px;
        box-shadow: none;
        color: #10151f;
        display: block;
        font: 16px Arial, sans-serif;
        padding: 10px;
        width: 100%;
      }

      .vibe-signup-extra {
        display: none;
      }

      .vibe-auth-modal.signup .vibe-signup-extra {
        display: block;
      }

      .vibe-auth-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 16px;
      }

      .vibe-auth-card .secondary {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.35);
        color: white;
      }

      .vibe-auth-status {
        color: #cfd6e4;
        min-height: 20px;
        margin-top: 12px;
      }
    `;
    document.head.appendChild(style);
  }

  function renderBar() {
    ensureStyles();
    if (isHomePage()) return;

    let bar = document.getElementById("vibe-auth-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "vibe-auth-bar";
      bar.className = "vibe-auth-bar";
      document.body.appendChild(bar);
    }

    const user = getUser();
    if (isLoggedIn()) {
      bar.innerHTML = `<span>Player: ${user.username}</span><button type="button">Logout</button>`;
      bar.querySelector("button").addEventListener("click", logout);
    } else {
      bar.innerHTML = `<span>Guest mode</span><button type="button">Login</button>`;
      bar.querySelector("button").addEventListener("click", () => showLoginRequired());
    }
  }

  function getModal() {
    ensureStyles();
    let modal = document.getElementById("vibe-auth-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "vibe-auth-modal";
    modal.className = "vibe-auth-modal";
    modal.innerHTML = `
      <div class="vibe-auth-card">
        <button type="button" class="vibe-auth-close" id="vibe-auth-close" aria-label="Close login box">&times;</button>
        <h2>Login to play more</h2>
        <p id="vibe-auth-copy">Create an account or login so your game score can be saved.</p>
        <form id="vibe-auth-form">
          <label for="vibe-auth-username">Username</label>
          <input id="vibe-auth-username" name="username" autocomplete="username" required>
          <div class="vibe-signup-extra">
            <label for="vibe-auth-email">Email</label>
            <input id="vibe-auth-email" name="email" type="email" autocomplete="email">
            <label for="vibe-auth-phone">Phone number</label>
            <input id="vibe-auth-phone" name="phone" type="tel" autocomplete="tel">
          </div>
          <label for="vibe-auth-password">Password</label>
          <input id="vibe-auth-password" name="password" type="password" autocomplete="current-password" required>
          <div class="vibe-auth-actions">
            <button type="submit" data-mode="login">Login</button>
            <button type="button" class="secondary" id="vibe-register-btn">Create account</button>
          </div>
          <p class="vibe-auth-status" id="vibe-auth-status"></p>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    const form = modal.querySelector("#vibe-auth-form");
    const status = modal.querySelector("#vibe-auth-status");
    const registerBtn = modal.querySelector("#vibe-register-btn");
    const closeBtn = modal.querySelector("#vibe-auth-close");
    const submitBtn = form.querySelector("button[type='submit']");
    const emailInput = modal.querySelector("#vibe-auth-email");
    const phoneInput = modal.querySelector("#vibe-auth-phone");

    closeBtn.addEventListener("click", () => {
      modal.classList.remove("open");
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const signupMode = modal.classList.contains("signup");
      status.textContent = signupMode ? "Creating account..." : "Logging in...";

      try {
        const formData = new FormData(form);
        const payload = {
          username: formData.get("username"),
          password: formData.get("password")
        };

        if (signupMode) {
          payload.email = formData.get("email");
          payload.phone = formData.get("phone");
        }

        const data = await api(signupMode ? "/api/register" : "/api/login", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        if (signupMode) {
          setLogin(data.token, data.user);
          modal.classList.remove("signup");
          emailInput.required = false;
          phoneInput.required = false;
          submitBtn.textContent = "Login";
          registerBtn.textContent = "Create account";
          status.textContent = data.message;
          modal.classList.remove("open");
          renderBar();
          window.dispatchEvent(new CustomEvent("vibe:login", { detail: data.user }));
          return;
        }

        setLogin(data.token, data.user);
        status.textContent = "Login successful.";
        modal.classList.remove("open");
        renderBar();
        window.dispatchEvent(new CustomEvent("vibe:login", { detail: data.user }));
      } catch (error) {
        status.textContent = error.message;
      }
    });

    registerBtn.addEventListener("click", async () => {
      if (!isHomePage()) {
        window.location.href = "index.html?auth=create";
        return;
      }

      if (!modal.classList.contains("signup")) {
        modal.classList.add("signup");
        emailInput.required = true;
        phoneInput.required = true;
        submitBtn.textContent = "Submit account";
        registerBtn.textContent = "Back to login";
        status.textContent = "Enter your details to create an account.";
        return;
      }

      modal.classList.remove("signup");
      emailInput.required = false;
      phoneInput.required = false;
      submitBtn.textContent = "Login";
      registerBtn.textContent = "Create account";
      status.textContent = "";
    });

    return modal;
  }

  function showLoginRequired(message) {
    const modal = getModal();
    const copy = modal.querySelector("#vibe-auth-copy");
    copy.textContent = message || "Your free round is over. Login to play more and save your score.";
    modal.classList.add("open");
    modal.querySelector("input").focus();
  }

  async function saveScore(game, score) {
    if (!isLoggedIn()) return null;
    return api("/api/scores", {
      method: "POST",
      body: JSON.stringify({ game, score })
    });
  }

  function finishRound(game, score) {
    if (isLoggedIn()) {
      return saveScore(game, score);
    }

    showLoginRequired("Login to play more. After login, your scores will be saved for this game.");
    return null;
  }

  window.VibeAuth = {
    finishRound,
    getToken,
    getUser,
    isLoggedIn,
    logout,
    renderBar,
    saveScore,
    showLoginRequired
  };

  document.addEventListener("DOMContentLoaded", () => {
    renderBar();

    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "create") {
      showLoginRequired("Create an account here, then login to continue playing and save your scores.");
    }
  });
})();
