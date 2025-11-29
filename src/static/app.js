document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: 'no-store' });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Limpa as opções do select (mantém placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        // Garante participants como array de strings (aceita objeto)
        let participantsArr = [];
        if (Array.isArray(details.participants)) {
          participantsArr = details.participants;
        } else if (details.participants && typeof details.participants === "object") {
          participantsArr = Object.values(details.participants);
        }

        const spotsLeft = (details.max_participants || 0) - participantsArr.length;

        // Monta HTML do card com seção de participantes em <ul> e botão de remoção
        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description || ""}</p>
          <p><strong>Schedule:</strong> ${details.schedule || ""}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <strong>Participantes (${participantsArr.length}/${details.max_participants || 0}):</strong>
            ${participantsArr.length > 0
              ? `<ul class="participants-list">${participantsArr.map(p => `<li data-email="${String(p)}" class="participant-item">${String(p)} <button class="remove-participant" title="Desregistrar">✖</button></li>`).join("")}</ul>`
              : `<p class="no-participants"><em>Nenhum participante inscrito ainda.</em></p>`
            }
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Event delegation: handle remove participant clicks for this activity
        const participantsListEl = activityCard.querySelector('.participants-list');
        if (participantsListEl) {
          participantsListEl.addEventListener('click', async (e) => {
            if (e.target && e.target.matches('.remove-participant')) {
              const li = e.target.closest('li');
              const email = li && li.dataset && li.dataset.email;
              if (!email) return;
              if (!confirm(`Remover ${email} de ${name}?`)) return;
              try {
                const resp = await fetch(`/activities/${encodeURIComponent(name)}/unregister?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
                const resJson = await resp.json();
                if (resp.ok) {
                  // Atualiza a lista de atividades/participantes após remoção
                  await fetchActivities();
                } else {
                  messageDiv.textContent = resJson.detail || resJson.message || 'Erro ao desregistrar';
                  messageDiv.className = 'error';
                  messageDiv.classList.remove('hidden');
                  setTimeout(() => messageDiv.classList.add('hidden'), 5000);
                }
              } catch (err) {
                console.error('Error unregistering:', err);
              }
            }
          });
        }

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

        if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Atualiza a lista de atividades e participantes após inscrição
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
