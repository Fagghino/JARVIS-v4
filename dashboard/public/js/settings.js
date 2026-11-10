/**
 * Script di gestione impostazioni Web Dashboard (per-server)
 * Estratto da settings.html per conformità CSP e miglior caching del browser.
 */

const currentGuildId = document.body.dataset.guildId || window.currentGuildId || "";

const DEFAULT_WELCOME = "Benvenuto nel server, {user}! Ora siamo in {count} membri!";
const DEFAULT_GOODBYE = "{user} ha lasciato il server. Ci mancherai!";

let serverChannels = [];
let serverRoles = [];
let currentBotInfo = null;
let pendingAvatarBase64 = undefined;
let pendingBannerBase64 = undefined;

// Aggiorna l'anteprima in tempo reale della card profilo del bot
function updateBotProfilePreview() {
  if (!currentBotInfo) return;

  const nickInput = document.getElementById("botNickname");
  const previewNick = document.getElementById("previewCardNick");
  const previewUser = document.getElementById("previewCardUser");
  const previewAvatar = document.getElementById("previewCardAvatar");
  const previewBanner = document.getElementById("previewCardBanner");
  const badgeAvatar = document.getElementById("badgeAvatarType");
  const badgeBanner = document.getElementById("badgeBannerType");

  // 1. Nickname / Username
  const displayNick = (nickInput && nickInput.value.trim()) || currentBotInfo.username || "J.A.R.V.I.S.";
  if (previewNick) previewNick.textContent = displayNick;
  if (previewUser) previewUser.textContent = `@${(currentBotInfo.username || "jarvis").toLowerCase()}`;

  // 2. Avatar
  if (pendingAvatarBase64 !== undefined) {
    if (pendingAvatarBase64 === null) {
      if (previewAvatar) previewAvatar.src = currentBotInfo.defaultAvatarUrl;
      if (badgeAvatar) {
        badgeAvatar.textContent = "🔄 Reset al default globale";
        badgeAvatar.className = "profile-badge-pill pending";
      }
    } else {
      if (previewAvatar) previewAvatar.src = pendingAvatarBase64;
      if (badgeAvatar) {
        badgeAvatar.textContent = "🟡 Avatar selezionato (da salvare)";
        badgeAvatar.className = "profile-badge-pill pending";
      }
    }
  } else {
    if (currentBotInfo.serverAvatarUrl) {
      if (previewAvatar) previewAvatar.src = currentBotInfo.serverAvatarUrl;
      if (badgeAvatar) {
        badgeAvatar.textContent = "🟢 Avatar Server Personalizzato";
        badgeAvatar.className = "profile-badge-pill customized";
      }
    } else {
      if (previewAvatar) previewAvatar.src = currentBotInfo.defaultAvatarUrl;
      if (badgeAvatar) {
        badgeAvatar.textContent = "🌐 Avatar Globale Predefinito";
        badgeAvatar.className = "profile-badge-pill";
      }
    }
  }

  // 3. Banner
  if (pendingBannerBase64 !== undefined) {
    if (pendingBannerBase64 === null) {
      if (previewBanner) previewBanner.style.backgroundImage = "none";
      if (badgeBanner) {
        badgeBanner.textContent = "🔄 Reset banner (rimozione)";
        badgeBanner.className = "profile-badge-pill pending";
      }
    } else {
      if (previewBanner) previewBanner.style.backgroundImage = `url("${pendingBannerBase64}")`;
      if (badgeBanner) {
        badgeBanner.textContent = "🟡 Banner selezionato (da salvare)";
        badgeBanner.className = "profile-badge-pill pending";
      }
    }
  } else {
    if (currentBotInfo.serverBannerUrl) {
      if (previewBanner) previewBanner.style.backgroundImage = `url("${currentBotInfo.serverBannerUrl}")`;
      if (badgeBanner) {
        badgeBanner.textContent = "🟢 Banner Server Personalizzato";
        badgeBanner.className = "profile-badge-pill customized";
      }
    } else {
      if (previewBanner) previewBanner.style.backgroundImage = "none";
      if (badgeBanner) {
        badgeBanner.textContent = "🌐 Nessun Banner";
        badgeBanner.className = "profile-badge-pill";
      }
    }
  }
}

function resetBotNickname() {
  const input = document.getElementById("botNickname");
  if (input && currentBotInfo) {
    input.value = "";
    updateBotProfilePreview();
    const hint = document.getElementById("nickStatusHint");
    if (hint) {
      hint.innerHTML = `🔄 Nome ripristinato al default del bot (<strong>${currentBotInfo.username}</strong>). Clicca <em>Salva Impostazioni</em> per applicare.`;
    }
    showToast(`Nome ripristinato al default: ${currentBotInfo.username}`, "success");
  }
}

function resetBotAvatar() {
  pendingAvatarBase64 = null;
  const fileInput = document.getElementById("botAvatarFile");
  if (fileInput) fileInput.value = "";
  const fileLabel = document.getElementById("avatarFileLabel");
  if (fileLabel) fileLabel.textContent = "Ripristino icona predefinita impostato";
  updateBotProfilePreview();
  showToast("Icona avatar del server impostata su Ripristino predefinito.", "success");
}

function resetBotBanner() {
  pendingBannerBase64 = null;
  const fileInput = document.getElementById("botBannerFile");
  if (fileInput) fileInput.value = "";
  const fileLabel = document.getElementById("bannerFileLabel");
  if (fileLabel) fileLabel.textContent = "Rimozione banner impostata";
  updateBotProfilePreview();
  showToast("Banner del server impostato su Rimozione.", "success");
}

// Switch tra le schede nella barra laterale
function switchSettingsTab(tabId, btn) {
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

  if (btn && btn.classList) {
    btn.classList.add('active');
  } else {
    const matchingBtn = document.querySelector(`.sidebar-btn[data-tab="${tabId}"]`);
    if (matchingBtn) matchingBtn.classList.add('active');
  }

  const targetPane = document.getElementById(tabId);
  if (targetPane) {
    targetPane.classList.add('active');
  }
}

function resetWelcomeText() {
  document.getElementById('welcomeMessageText').value = DEFAULT_WELCOME;
  showToast("Testo di benvenuto ripristinato al default.", "success");
}

function resetGoodbyeText() {
  document.getElementById('goodbyeMessageText').value = DEFAULT_GOODBYE;
  showToast("Testo di addio ripristinato al default.", "success");
}

function showToast(msg, type = "success") {
  const box = document.getElementById("toastAlert");
  if (!box) return;
  box.textContent = msg;
  box.className = `toast-alert toast-${type}`;
  box.style.display = "block";
  setTimeout(() => {
    box.style.display = "none";
  }, 5000);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Esponi globalmente le funzioni per inline handlers o chiamate esterne
window.switchSettingsTab = switchSettingsTab;
window.resetWelcomeText = resetWelcomeText;
window.resetGoodbyeText = resetGoodbyeText;
window.showToast = showToast;
window.openNewRoleModal = openNewRoleModal;
window.closeNewRoleModal = closeNewRoleModal;
window.saveNewReactionRole = saveNewReactionRole;
window.deleteReactionRole = deleteReactionRole;

// Caricamento Dati Iniziali
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Registra i click listener espliciti per la navigazione delle tab della sidebar
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = btn.getAttribute('data-tab');
      if (targetTab) {
        switchSettingsTab(targetTab, btn);
      }
    });
  });

  // 2. Registra listener per bottoni modale e reset
  document.getElementById("btnResetWelcomeText")?.addEventListener("click", resetWelcomeText);
  document.getElementById("btnResetGoodbyeText")?.addEventListener("click", resetGoodbyeText);
  document.getElementById("btnOpenNewRoleModal")?.addEventListener("click", openNewRoleModal);
  document.getElementById("btnCloseRoleModalIcon")?.addEventListener("click", closeNewRoleModal);
  document.getElementById("btnCancelRoleModal")?.addEventListener("click", closeNewRoleModal);
  document.getElementById("btnSaveRoleModal")?.addEventListener("click", saveNewReactionRole);

  // 3. Listener per personalizzazione bot (Nickname, Avatar, Banner)
  document.getElementById("botNickname")?.addEventListener("input", updateBotProfilePreview);
  document.getElementById("btnResetNickname")?.addEventListener("click", resetBotNickname);

  const avatarFileInput = document.getElementById("botAvatarFile");
  document.getElementById("btnChooseAvatar")?.addEventListener("click", () => {
    avatarFileInput?.click();
  });
  avatarFileInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("L'immagine dell'avatar supera i 5 MB consentiti.", "error");
      file.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      pendingAvatarBase64 = evt.target.result;
      const fileLabel = document.getElementById("avatarFileLabel");
      if (fileLabel) fileLabel.textContent = file.name;
      updateBotProfilePreview();
      showToast("Nuovo avatar selezionato! Clicca Salva per applicarlo a questo server.", "success");
    };
    reader.readAsDataURL(file);
  });
  document.getElementById("btnResetAvatar")?.addEventListener("click", resetBotAvatar);

  const bannerFileInput = document.getElementById("botBannerFile");
  document.getElementById("btnChooseBanner")?.addEventListener("click", () => {
    bannerFileInput?.click();
  });
  bannerFileInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("L'immagine del banner supera i 5 MB consentiti.", "error");
      file.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      pendingBannerBase64 = evt.target.result;
      const fileLabel = document.getElementById("bannerFileLabel");
      if (fileLabel) fileLabel.textContent = file.name;
      updateBotProfilePreview();
      showToast("Nuovo banner selezionato! Clicca Salva per applicarlo a questo server.", "success");
    };
    reader.readAsDataURL(file);
  });
  document.getElementById("btnResetBanner")?.addEventListener("click", resetBotBanner);

  try {
    const res = await fetch(`/api/settings/${currentGuildId}`);
    if (!res.ok) throw new Error("Impossibile caricare le impostazioni.");

    const data = await res.json();
    const { currentConfig, channels, roles, botInfo, stats } = data;

    serverChannels = channels || [];
    serverRoles = roles || [];

    // Popola Statistiche Recap
    if (stats) {
      const elMembers = document.getElementById('statMembersCount');
      if (elMembers) elMembers.textContent = stats.memberCount.toLocaleString();
      const elChannels = document.getElementById('statChannelsCount');
      if (elChannels) elChannels.textContent = stats.channelCount;
      const elRoles = document.getElementById('statRolesCount');
      if (elRoles) elRoles.textContent = stats.roleCount;
    }

    // Carica Grafici Analytics (IDEA-004)
    loadAnalyticsCharts(7);

    // Popola Bot Info
    if (botInfo) {
      currentBotInfo = botInfo;
      const elNick = document.getElementById('botNickname');
      if (elNick) elNick.value = botInfo.nickname || "";
      updateBotProfilePreview();
    }

    // Popola Selettori Canali & Ruoli
    populateSelects();

    // Popola Valori Form
    document.getElementById("welcomeChannelId").value = currentConfig.welcomeChannelId || "";
    document.getElementById("goodbyeChannelId").value = currentConfig.goodbyeChannelId || "";
    document.getElementById("welcomeMessageText").value = currentConfig.welcomeMessageText || DEFAULT_WELCOME;
    document.getElementById("goodbyeMessageText").value = currentConfig.goodbyeMessageText || DEFAULT_GOODBYE;
    document.getElementById("newMemberRoleId").value = currentConfig.newMemberRoleId || "";
    document.getElementById("botRoleId").value = currentConfig.botRoleId || "";
    document.getElementById("levelUpChannelId").value = currentConfig.levelUpChannelId || "";
    document.getElementById("totalChannelId").value = currentConfig.totalChannelId || "";
    document.getElementById("usersChannelId").value = currentConfig.usersChannelId || "";
    document.getElementById("botsChannelId").value = currentConfig.botsChannelId || "";
    document.getElementById("inviteLink").value = currentConfig.inviteLink || "";

    // Popola Slider Toggle Switches
    const feat = currentConfig.features || {};
    document.getElementById("featureWelcomeEnabled").checked = feat.welcomeEnabled !== false;
    document.getElementById("featureReactionRolesEnabled").checked = feat.reactionRolesEnabled !== false;
    document.getElementById("featureCounterEnabled").checked = feat.counterEnabled !== false;
    document.getElementById("featureXpEnabled").checked = feat.xpEnabled !== false;

    // Popola Slider Toggle Comandi
    const cmds = currentConfig.commands || {};
    document.getElementById("cmd_flip").checked = cmds.flip !== false;
    document.getElementById("cmd_roll").checked = cmds.roll !== false;
    document.getElementById("cmd_ping").checked = cmds.ping !== false;
    document.getElementById("cmd_serverinfo").checked = cmds.serverinfo !== false;
    document.getElementById("cmd_userinfo").checked = cmds.userinfo !== false;

    // Render Quick Recap Moduli
    renderQuickRecap(feat, cmds);

    // Carica Reaction Roles
    await loadReactionRoles();

    const loader = document.getElementById("settingsLoader");
    if (loader) loader.style.display = "none";
    const layout = document.getElementById("settingsLayout");
    if (layout) layout.style.display = "grid";

  } catch (err) {
    console.error(err);
    const loader = document.getElementById("settingsLoader");
    if (loader) {
      loader.innerHTML = `<p style="color: var(--offline)">❌ Errore durante il caricamento delle impostazioni. Verifica che il bot sia online.</p>`;
    }
  }

  // Handler Submit Form Master
  document.getElementById("masterSettingsForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btnSave = document.getElementById("btnMasterSave");
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.innerHTML = "<span>💾</span><span>Salvataggio...</span>";
    }

    const payload = {
      welcomeChannelId: document.getElementById("welcomeChannelId").value,
      goodbyeChannelId: document.getElementById("goodbyeChannelId").value,
      welcomeMessageText: document.getElementById("welcomeMessageText").value,
      goodbyeMessageText: document.getElementById("goodbyeMessageText").value,
      newMemberRoleId: document.getElementById("newMemberRoleId").value,
      botRoleId: document.getElementById("botRoleId").value,
      levelUpChannelId: document.getElementById("levelUpChannelId").value,
      totalChannelId: document.getElementById("totalChannelId").value,
      usersChannelId: document.getElementById("usersChannelId").value,
      botsChannelId: document.getElementById("botsChannelId").value,
      inviteLink: document.getElementById("inviteLink").value,
      botNickname: document.getElementById("botNickname").value,
      features: {
        welcomeEnabled: document.getElementById("featureWelcomeEnabled").checked,
        reactionRolesEnabled: document.getElementById("featureReactionRolesEnabled").checked,
        counterEnabled: document.getElementById("featureCounterEnabled").checked,
        xpEnabled: document.getElementById("featureXpEnabled").checked
      },
      commands: {
        flip: document.getElementById("cmd_flip").checked,
        roll: document.getElementById("cmd_roll").checked,
        ping: document.getElementById("cmd_ping").checked,
        serverinfo: document.getElementById("cmd_serverinfo").checked,
        userinfo: document.getElementById("cmd_userinfo").checked
      }
    };

    if (pendingAvatarBase64 !== undefined) {
      payload.botAvatar = pendingAvatarBase64;
    }
    if (pendingBannerBase64 !== undefined) {
      payload.botBanner = pendingBannerBase64;
    }

    try {
      const res = await fetch(`/api/settings/${currentGuildId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const resData = await res.json();
      if (res.ok) {
        if (resData.profileNotice) {
          showToast(`✅ Impostazioni salvate! ${resData.profileNotice}`, "success");
        } else {
          showToast("✅ Tutte le impostazioni del server sono state salvate con successo!", "success");
        }
        // Aggiorna stato locale dell'avatar e del banner
        if (currentBotInfo) {
          if (pendingAvatarBase64 !== undefined) {
            currentBotInfo.serverAvatarUrl = pendingAvatarBase64;
            pendingAvatarBase64 = undefined;
          }
          if (pendingBannerBase64 !== undefined) {
            currentBotInfo.serverBannerUrl = pendingBannerBase64;
            pendingBannerBase64 = undefined;
          }
        }
        const fileAvatarLabel = document.getElementById("avatarFileLabel");
        if (fileAvatarLabel) fileAvatarLabel.textContent = "Nessun file selezionato";
        const fileBannerLabel = document.getElementById("bannerFileLabel");
        if (fileBannerLabel) fileBannerLabel.textContent = "Nessun file selezionato";
        updateBotProfilePreview();
        renderQuickRecap(payload.features, payload.commands);
      } else {
        showToast("❌ Errore durante il salvataggio: " + resData.message, "error");
      }
    } catch (err) {
      showToast("❌ Errore di connessione.", "error");
    } finally {
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.innerHTML = "<span>💾</span><span>Salva Impostazioni Server</span>";
      }
    }
  });

  // Handler Sincronizzazione Membri
  document.getElementById("btnSyncMembers")?.addEventListener("click", async () => {
    const btn = document.getElementById("btnSyncMembers");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Sincronizzazione...";
    }

    try {
      const res = await fetch(`/api/sync-members/${currentGuildId}`, { method: "POST" });
      const resData = await res.json();
      if (res.ok) {
        showToast(`✅ Sincronizzati ${resData.total || 0} membri su MongoDB Cloud!`, "success");
      } else {
        showToast("❌ " + resData.message, "error");
      }
    } catch (err) {
      showToast("❌ Errore sincronizzazione membri.", "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = "<span>🔄</span><span>Sincronizza Membri</span>";
      }
    }
  });
});

function populateSelects() {
  const textChannels = serverChannels.filter(c => c.type === 0);
  const voiceChannels = serverChannels.filter(c => c.type === 2);

  document.querySelectorAll(".text-channel-select").forEach(sel => {
    sel.innerHTML = '<option value="">Nessun canale selezionato</option>';
    textChannels.forEach(ch => {
      const opt = document.createElement("option");
      opt.value = ch.id;
      opt.textContent = `# ${ch.name}`;
      sel.appendChild(opt);
    });
  });

  document.querySelectorAll(".voice-channel-select").forEach(sel => {
    sel.innerHTML = '<option value="">Nessun canale selezionato</option>';
    voiceChannels.forEach(ch => {
      const opt = document.createElement("option");
      opt.value = ch.id;
      opt.textContent = `🔊 ${ch.name}`;
      sel.appendChild(opt);
    });
  });

  document.querySelectorAll(".role-select").forEach(sel => {
    sel.innerHTML = '<option value="">Nessun ruolo selezionato</option>';
    serverRoles.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r.id;
      opt.textContent = `@${r.name}`;
      sel.appendChild(opt);
    });
  });
}

function renderQuickRecap(features = {}, commands = {}) {
  const listEl = document.getElementById("modulesQuickRecap");
  if (!listEl) return;
  const modules = [
    { name: "Benvenuto & Addio", key: "welcomeEnabled", icon: "👋" },
    { name: "Reaction Roles", key: "reactionRolesEnabled", icon: "🎭" },
    { name: "Contatori Canali Vocali", key: "counterEnabled", icon: "📈" },
    { name: "Sistema XP & Livelli", key: "xpEnabled", icon: "🏆" }
  ];

  const cmdList = ['flip', 'ping', 'roll', 'serverinfo', 'userinfo'];
  const activeCmdsCount = cmdList.filter(c => commands[c] !== false).length;

  listEl.innerHTML = modules.map(m => {
    const isEnabled = features[m.key] !== false;
    return `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.03); border-radius: 10px; border: 1px solid rgba(255,255,255,0.06);">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>${m.icon}</span>
        <span style="font-size: 0.88rem; font-weight: 600; color: #fff;">${m.name}</span>
      </div>
      <span style="font-size: 0.72rem; font-weight: 700; color: ${isEnabled ? '#00e676' : '#ff5252'}; background: ${isEnabled ? 'rgba(0,230,118,0.1)' : 'rgba(255,82,82,0.1)'}; padding: 2px 8px; border-radius: 8px;">
        ${isEnabled ? 'ATTIVO' : 'DISATTIVATO'}
      </span>
    </div>
  `;
  }).join('') + `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.03); border-radius: 10px; border: 1px solid rgba(255,255,255,0.06);">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>⚡</span>
        <span style="font-size: 0.88rem; font-weight: 600; color: #fff;">Comandi Slash Attivi</span>
      </div>
      <span style="font-size: 0.72rem; font-weight: 700; color: #00d2ff; background: rgba(0,210,255,0.1); padding: 2px 8px; border-radius: 8px;">
        ${activeCmdsCount} / 5 ATTIVI
      </span>
    </div>
  `;
}

// Reaction Roles Logic
async function loadReactionRoles() {
  const container = document.getElementById("rolesListContainer");
  if (!container) return;
  try {
    const res = await fetch(`/api/reaction-roles/${currentGuildId}`);
    if (!res.ok) throw new Error("Errore recupero reaction roles");
    const list = await res.json();

    if (!list || list.length === 0) {
      container.innerHTML = `
      <div style="padding: 24px; text-align: center; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px; color: var(--text-muted); font-size: 0.88rem;">
        Nessun Reaction Role configurato su questo server. Clicca su "+ Aggiungi Reaction Role" in alto a destra per crearne uno!
      </div>
    `;
      return;
    }

    let html = `
    <table class="roles-table">
      <thead>
        <tr>
          <th>Canale</th>
          <th>ID Messaggio</th>
          <th>Titolo / Regola</th>
          <th>Emoji ➔ Ruoli</th>
          <th style="text-align: right;">Azioni</th>
        </tr>
      </thead>
      <tbody>
  `;

    list.forEach(item => {
      const channel = serverChannels.find(c => c.id === item.channelId);
      const channelName = channel ? `# ${channel.name}` : item.channelId;

      let rolesHtml = "";
      const map = item.rolesMap || {};
      for (const [emoji, roleId] of Object.entries(map)) {
        const role = serverRoles.find(r => r.id === roleId);
        const roleName = role ? `@${role.name}` : roleId;
        rolesHtml += `<span class="role-badge"><span>${emoji}</span> <span>${roleName}</span></span>`;
      }

      html += `
      <tr>
        <td><strong style="color: #00d2ff;">${channelName}</strong></td>
        <td><code style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #94a3b8;">${item.messageId}</code></td>
        <td><span style="color: #fff; font-weight: 600;">${item.title || "Reaction Role"}</span></td>
        <td>${rolesHtml || "Nessun ruolo mappato"}</td>
        <td style="text-align: right;">
          <button type="button" class="btn-del-role" onclick="deleteReactionRole('${item._id}')">
            🗑️ Elimina
          </button>
        </td>
      </tr>
    `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="color: #ff5252; font-size: 0.85rem;">Impossibile recuperare i Reaction Roles.</p>`;
  }
}

function openNewRoleModal() {
  document.getElementById("newRoleModal")?.classList.add("open");
}

function closeNewRoleModal() {
  document.getElementById("newRoleModal")?.classList.remove("open");
}

async function saveNewReactionRole() {
  const channelId = document.getElementById("modalRoleChannel").value;
  const messageId = document.getElementById("modalRoleMsgId").value.trim();
  const title = document.getElementById("modalRoleTitle").value.trim();
  const emoji = document.getElementById("modalRoleEmoji").value.trim();
  const roleId = document.getElementById("modalRoleSelect").value;

  if (!channelId || !messageId || !emoji || !roleId) {
    alert("Tutti i campi (Canale, ID Messaggio, Emoji e Ruolo) sono obbligatori!");
    return;
  }

  const rolesMap = {};
  rolesMap[emoji] = roleId;

  try {
    const res = await fetch(`/api/reaction-roles/${currentGuildId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, messageId, title, rolesMap })
    });
    const resData = await res.json();
    if (res.ok) {
      closeNewRoleModal();
      showToast("✅ Reaction Role aggiunto e sincronizzato con successo!", "success");
      await loadReactionRoles();
      // Reset campi modale
      document.getElementById("modalRoleMsgId").value = "";
      document.getElementById("modalRoleTitle").value = "";
      document.getElementById("modalRoleEmoji").value = "";
    } else {
      alert("❌ " + resData.message);
    }
  } catch (err) {
    alert("❌ Errore durante il salvataggio.");
  }
}

async function deleteReactionRole(id) {
  if (!confirm("Sei sicuro di voler eliminare questa regola di reaction role?")) return;

  try {
    const res = await fetch(`/api/reaction-roles/${currentGuildId}/${id}`, {
      method: "DELETE"
    });
    const resData = await res.json();
    if (res.ok) {
      showToast("✅ Reaction Role rimosso con successo.", "success");
      await loadReactionRoles();
    } else {
      showToast("❌ " + resData.message, "error");
    }
  } catch (err) {
    showToast("❌ Errore durante l'eliminazione.", "error");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GESTIONE ANALYTICS & GRAFICI INTERATTIVI (IDEA-004)
// ─────────────────────────────────────────────────────────────────────────────
let chartMessagesInstance = null;
let chartVoiceInstance = null;
let currentAnalyticsDays = 7;

async function loadAnalyticsCharts(days = 7) {
  currentAnalyticsDays = days;
  try {
    const res = await fetch(`/api/guilds/${currentGuildId}/analytics?days=${days}`);
    const data = await res.json();
    if (!data.success) return;

    renderMessagesChart(data.labels, data.messages);
    renderVoiceChart(data.labels, data.voiceHours, data.activeUsers);
  } catch (err) {
    console.error("Errore caricamento analytics:", err);
  }
}

function renderMessagesChart(labels, values) {
  const canvas = document.getElementById("chartMessages");
  if (!canvas || typeof Chart === "undefined") return;
  const ctx = canvas.getContext("2d");

  if (chartMessagesInstance) {
    chartMessagesInstance.destroy();
  }

  chartMessagesInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Messaggi",
          data: values,
          borderColor: "#00e676",
          backgroundColor: "rgba(0, 230, 118, 0.12)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: "#00e676",
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          titleColor: "#f8fafc",
          bodyColor: "#00e676",
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderWidth: 1,
          padding: 10,
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255, 255, 255, 0.05)" },
          ticks: { color: "#94a3b8", font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255, 255, 255, 0.05)" },
          ticks: { color: "#94a3b8", font: { size: 11 }, precision: 0 },
        },
      },
    },
  });
}

function renderVoiceChart(labels, voiceHours, activeUsers) {
  const canvas = document.getElementById("chartVoice");
  if (!canvas || typeof Chart === "undefined") return;
  const ctx = canvas.getContext("2d");

  if (chartVoiceInstance) {
    chartVoiceInstance.destroy();
  }

  chartVoiceInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Ore Vocali",
          data: voiceHours,
          borderColor: "#818cf8",
          backgroundColor: "rgba(129, 140, 248, 0.12)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: "#818cf8",
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: "y",
        },
        {
          label: "Utenti Attivi",
          data: activeUsers,
          borderColor: "#38bdf8",
          borderDash: [5, 5],
          backgroundColor: "transparent",
          tension: 0.2,
          borderWidth: 2,
          pointBackgroundColor: "#38bdf8",
          pointRadius: 3,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: { color: "#94a3b8", boxWidth: 12, font: { size: 11 } },
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          titleColor: "#f8fafc",
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderWidth: 1,
          padding: 10,
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255, 255, 255, 0.05)" },
          ticks: { color: "#94a3b8", font: { size: 11 } },
        },
        y: {
          type: "linear",
          display: true,
          position: "left",
          beginAtZero: true,
          grid: { color: "rgba(255, 255, 255, 0.05)" },
          ticks: { color: "#818cf8", font: { size: 11 } },
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: { color: "#38bdf8", font: { size: 11 }, precision: 0 },
        },
      },
    },
  });
}

function switchAnalyticsRange(days, btn) {
  document.querySelectorAll(".btn-analytics-range").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  loadAnalyticsCharts(days);
}

