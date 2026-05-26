function loadUserProfile() {
    const userJson = localStorage.getItem("user");
    if (!userJson) {
        window.location.href = "./Login.html";
        return;
    }

    const user = JSON.parse(userJson);
    const fullName = user.user?.fullName || user.user?.FullName || "User";
    const role = user.user?.role || user.user?.Role || "user";
    const username = user.user?.username || user.user?.Username || "Unknown";
    const email = user.user?.email || user.user?.Email || "";
    const phoneNumber = user.user?.phoneNumber || user.user?.PhoneNumber || "-";
    const avatarUrl = user.user?.avatar || user.user?.Avatar || null;

    const profileAvatar = document.getElementById("profileAvatar");
    if (profileAvatar) {
        if (avatarUrl) {
            profileAvatar.innerHTML = `<img src="${avatarUrl}" alt="Avatar">`;
        } else {
            const avatar = fullName.charAt(0).toUpperCase();
            profileAvatar.textContent = avatar;
        }
    }

    const profileName = document.getElementById("profileName");
    const profileRole = document.getElementById("profileRole");

    if (profileName) profileName.textContent = fullName;
    if (profileRole) profileRole.textContent = role || "user";

    window.currentUser = {
        fullName,
        role,
        username,
        email,
        phoneNumber,
        avatar: avatarUrl
    };
}

function openAccountModal() {
    if (!window.currentUser) return;

    const {
        username,
        fullName,
        role,
        phoneNumber,
        email,
        avatar
    } = window.currentUser;

    setValue("accountUsername", username || "");
    setValue("accountFullName", fullName || "");
    setValue("accountRole", role || "");
    setValue("accountPhoneNumber", phoneNumber || "");
    setValue("accountEmail", email || "");

    const previewEl = document.getElementById("accountAvatarPreview");
    if (previewEl) {
        if (avatar) {
            previewEl.innerHTML = `<img src="${avatar}" alt="Avatar">`;
        } else {
            previewEl.textContent = (fullName || "U").charAt(0).toUpperCase();
        }
    }

    openModal("accountModal");
}

function closeAccountModal() {
    closeModal("accountModal");
}

function handleAccountAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const preview = document.getElementById("accountAvatarPreview");
        if (preview) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Avatar">`;
        }
    };
    reader.readAsDataURL(file);
}

function clearFieldError(errorId) {
    const el = document.getElementById(errorId);
    if (el) {
        el.textContent = "";
        el.classList.remove("show");
    }
}

function showFieldError(errorId, message) {
    const el = document.getElementById(errorId);
    if (el) {
        el.textContent = message;
        el.classList.add("show");
    }
}

function clearAccountErrors() {
    [
        "accountFullNameError",
        "accountPhoneError",
        "accountEmailError",
        "accountCurrentPasswordError",
        "accountNewPasswordError",
        "accountConfirmPasswordError"
    ].forEach(clearFieldError);
}

async function saveAccountInfo() {
    clearAccountErrors();

    const fullName = document.getElementById("accountFullName")?.value.trim() || "";
    const phoneNumber = document.getElementById("accountPhoneNumber")?.value.trim() || "";
    const email = document.getElementById("accountEmail")?.value.trim() || "";

    let hasError = false;

    if (!fullName) {
        showFieldError("accountFullNameError", "Họ tên không được để trống");
        hasError = true;
    }

    if (!phoneNumber) {
        showFieldError("accountPhoneError", "Số điện thoại không được để trống");
        hasError = true;
    }

    if (hasError) return;

    if (window.currentUser) {
        window.currentUser.fullName = fullName;
        window.currentUser.phoneNumber = phoneNumber;
        window.currentUser.email = email;
    }

    const profileName = document.getElementById("profileName");
    if (profileName) profileName.textContent = fullName;

    const profileAvatar = document.getElementById("profileAvatar");
    if (profileAvatar && !window.currentUser?.avatar) {
        profileAvatar.textContent = (fullName || "U").charAt(0).toUpperCase();
    }

    showToast("Đã lưu thông tin tài khoản (demo FE).", "success");
}

async function changePassword() {
  clearAccountErrors();

  const currentPassword = document.getElementById("accountCurrentPassword")?.value || "";
  const newPassword = document.getElementById("accountNewPassword")?.value || "";
  const confirmPassword = document.getElementById("accountConfirmPassword")?.value || "";

  let hasError = false;

  if (!currentPassword) {
    showFieldError("accountCurrentPasswordError", "Vui lòng nhập mật khẩu hiện tại");
    hasError = true;
  }

  if (!newPassword) {
    showFieldError("accountNewPasswordError", "Vui lòng nhập mật khẩu mới");
    hasError = true;
  }

  if (newPassword && newPassword.length < 6) {
    showFieldError("accountNewPasswordError", "Mật khẩu mới phải có ít nhất 6 ký tự");
    hasError = true;
  }

  if (newPassword !== confirmPassword) {
    showFieldError("accountConfirmPasswordError", "Mật khẩu xác nhận không khớp");
    hasError = true;
  }

  if (hasError) return;

  try {
    const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}/Auth/change-password`, {
      method: "PUT",
      headers: Auth.buildHeaders(),
      body: JSON.stringify({
        CurrentPassword: currentPassword,
        NewPassword: newPassword,
        ConfirmPassword: confirmPassword
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      showToast(data.message || "Đổi mật khẩu thất bại", "error");
      return;
    }

    const newToken = data.token || data.Token;

    if (newToken) {
      localStorage.setItem("token", newToken);

      const userJson = localStorage.getItem("user");
      if (userJson) {
        const user = JSON.parse(userJson);
        user.token = newToken;
        user.Token = newToken;
        localStorage.setItem("user", JSON.stringify(user));
      }
    }

    document.getElementById("accountCurrentPassword").value = "";
    document.getElementById("accountNewPassword").value = "";
    document.getElementById("accountConfirmPassword").value = "";

    showToast(data.message || "Đổi mật khẩu thành công!", "success");
  } catch (error) {
    console.error("Change password error:", error);
    showToast("Không thể kết nối tới server", "error");
  }
}