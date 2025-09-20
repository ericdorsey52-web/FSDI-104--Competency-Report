/* scripts.js
   Shared logic for index.html and registration.html
   - Salon object literal
   - Pet constructor
   - localStorage persistence
   - displayRow() renders pet rows in a table
   - add / delete pets
*/

// ------------------ Salon (object literal) ------------------
const salon = {
  name: "Happy Paws Pet Salon",
  phone: "555-123-4567",
  address: {
    street: "123 Pet Street",
    city: "Pawville",
    state: "CA"
  },
  hours: {
    open: "9:00 AM",
    close: "6:00 PM"
  }
};

// ------------------ Pet constructor ------------------
class Pet {
  constructor(name, age, gender, breed, service, type, color, paymentMethod) {
    this.id = Pet.generateId(); // unique id for deletion
    this.name = name;
    this.age = age;
    this.gender = gender;
    this.breed = breed;
    this.service = service;
    this.type = type;
    this.color = color;
    this.paymentMethod = paymentMethod;
  }

  // static id generator (simple)
  static generateId() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  }
}

// ------------------ Persistence ------------------
// load pets from localStorage; if none, initialize with defaults
let pets = (function loadPets() {
  try {
    const raw = localStorage.getItem('pets');
    if (!raw) {
      // default pets
      const defaults = [
        new Pet("Bella", 3, "Female", "Golden Retriever", "Grooming", "Dog", "Golden", "Card"),
        new Pet("Max", 5, "Male", "Bulldog", "Bath", "Dog", "Brindle", "Cash"),
        new Pet("Luna", 2, "Female", "Poodle", "Haircut", "Dog", "White", "Mobile Pay")
      ];
      localStorage.setItem('pets', JSON.stringify(defaults));
      return defaults;
    }
    // parse and map plain objects back to Pet instances as needed
    const arr = JSON.parse(raw);
    // ensure each object has an id; if not, create one
    return arr.map(o => {
      if (!o.id) o.id = Pet.generateId();
      return o;
    });
  } catch (err) {
    console.error("Failed to load pets from localStorage:", err);
    return [];
  }
})();

function savePets() {
  localStorage.setItem('pets', JSON.stringify(pets));
}

// ------------------ Display helpers ------------------

// show salon info on index
function displaySalonInfo() {
  const el = document.getElementById('salonInfo');
  if (!el) return;
  el.innerHTML = `
    <div class="card p-3 shadow-sm">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h3 class="h6 mb-1">${salon.name}</h3>
          <div class="small text-muted">
            ${salon.address.street}, ${salon.address.city}, ${salon.address.state} • ${salon.phone}
          </div>
        </div>
        <div class="text-end small">
          <div><strong>Hours</strong></div>
          <div class="text-muted">${salon.hours.open} — ${salon.hours.close}</div>
        </div>
      </div>
    </div>
  `;
}

// display total pets in alert
function displayPetCount() {
  const el = document.getElementById('petCount');
  if (!el) return;
  el.textContent = `Total Pets Registered: ${pets.length}`;
}

// display pets as table rows (renamed from displayPet -> displayRow)
function displayRow() {
  const tbody = document.getElementById('petTable');
  const noPetsMsg = document.getElementById('noPetsMessage');
  if (!tbody) return;

  // clear
  tbody.innerHTML = '';

  if (pets.length === 0) {
    noPetsMsg.textContent = 'No pets registered yet. Use "Register New Pet" to add one.';
  } else {
    noPetsMsg.textContent = '';
  }

  pets.forEach(pet => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${escapeHtml(pet.name)}</td>
      <td>${escapeHtml(String(pet.age))}</td>
      <td>${escapeHtml(pet.gender)}</td>
      <td>${escapeHtml(pet.breed)}</td>
      <td>${escapeHtml(pet.service)}</td>
      <td>${escapeHtml(pet.type)}</td>
      <td>${escapeHtml(pet.color)}</td>
      <td>${escapeHtml(pet.paymentMethod)}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-danger" data-id="${pet.id}" title="Delete">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // attach delete handlers
  tbody.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', function () {
      const id = this.getAttribute('data-id');
      deletePet(id);
    });
  });
}

// ------------------ CRUD operations ------------------

// register a new pet (used by the registration form)
function registerPetFromForm(formElement) {
  const name = document.getElementById('petName').value.trim();
  const age = document.getElementById('petAge').value;
  const gender = document.getElementById('petGender').value;
  const breed = document.getElementById('petBreed').value.trim();
  const service = document.getElementById('petService').value;
  const type = document.getElementById('petType').value;
  const color = document.getElementById('petColor').value.trim();
  const paymentMethod = document.getElementById('petPayment').value;

  // basic validation (more can be added)
  if (!name || !age || !gender || !breed || !service || !type || !color || !paymentMethod) {
    showRegisterMessage('Please complete all fields.', 'danger');
    return null;
  }

  const newPet = new Pet(name, Number(age), gender, breed, service, type, color, paymentMethod);
  pets.push(newPet);
  savePets();
  displayPetCount();
  return newPet;
}

// delete pet by id
function deletePet(id) {
  const idx = pets.findIndex(p => p.id === id);
  if (idx === -1) return;
  const removed = pets.splice(idx, 1)[0];
  savePets();
  displayRow();
  displayPetCount();

  // small feedback (toast or message)
  flashAlert(`${removed.name} has been deleted.`, 'warning');
}

// ------------------ UI helpers ------------------

// Bind registration form submit behaviour (called from registration.html)
function bindRegistrationForm() {
  const form = document.getElementById('petForm');
  const msgEl = document.getElementById('registerMsg');

  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const newPet = registerPetFromForm(form);
    if (!newPet) return;

    // show success message
    showRegisterMessage(`${newPet.name} registered successfully!`, 'success');

    // clear form
    form.reset();

    // redirect back to home after a short delay (UX), or just stay here.
    // We'll redirect after 800ms so users see confirmation — if they prefer immediate manual navigation, remove this.
    setTimeout(() => {
      // update index page when returning (index will read localStorage on load)
      window.location.href = 'index.html';
    }, 800);
  });
}

// small register message helper
function showRegisterMessage(message, type = 'info') {
  const el = document.getElementById('registerMsg');
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type} small mb-0">${escapeHtml(message)}</div>`;
}

// small flash alert on index page (non-blocking)
function flashAlert(message, variant = 'info') {
  // create a temporary floating alert at top-right
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="toast align-items-center text-bg-${variant} border-0 show" role="alert" aria-live="assertive" aria-atomic="true" style="min-width: 220px;">
      <div class="d-flex">
        <div class="toast-body small">
          ${escapeHtml(message)}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;
  wrapper.style.position = 'fixed';
  wrapper.style.top = '20px';
  wrapper.style.right = '20px';
  wrapper.style.zIndex = 9999;
  document.body.appendChild(wrapper);

  // remove after 2.2s
  setTimeout(() => {
    wrapper.remove();
  }, 2200);
}

// safe text escape for simple cases
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

// ------------------ Auto-run on index.html ------------------
if (typeof window !== 'undefined' && document.getElementById('petTable')) {
  // When index.html loads, ensure the UI is rendered
  displaySalonInfo();
  displayPetCount();
  displayRow();
}

// Expose some functions in case inline scripts need them
window.displayRow = displayRow;
window.displayPetCount = displayPetCount;
window.displaySalonInfo = displaySalonInfo;
window.bindRegistrationForm = bindRegistrationForm;

function registerPetFromForm() {
  // get form values
  const name = $("#petName").val().trim();
  const age = $("#petAge").val().trim();
  const gender = $("#petGender").val().trim();
  const breed = $("#petBreed").val().trim();
  const service = $("#petService").val().trim();
  const type = $("#petType").val().trim();
  const color = $("#petColor").val().trim();
  const paymentMethod = $("#petPayment").val().trim();
  const fileInput = $("#petImage")[0];
  let imageURL = "images/default-pet.png";

  if (fileInput && fileInput.files.length > 0) {
    imageURL = URL.createObjectURL(fileInput.files[0]);
  }

  // remove old red borders
  $("input, select").removeClass("is-invalid");

  // validation check
  let isValid = true;
  $("#registerForm input, #registerForm select").each(function () {
    if ($(this).val().trim() === "") {
      $(this).addClass("is-invalid"); // bootstrap red border
      isValid = false;
    }
  });

  if (!isValid) return; // stop if validation failed

  // create new Pet (or Service) object
  const newPet = new Pet(name, Number(age), gender, breed, service, type, color, paymentMethod, imageURL);
  salon.pets.push(newPet);

  // update table
  displayRow(newPet);

  // clear form
  $("#registerForm")[0].reset();
}

// Dark mode toggle
 const toggleBtn = document.getElementById("darkModeToggle");

  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    // update button text dynamically
    if (document.body.classList.contains("dark-mode")) {
      toggleBtn.textContent = "☀️ Light Mode";
      toggleBtn.classList.remove("btn-outline-light");
      toggleBtn.classList.add("btn-outline-warning");
    } else {
      toggleBtn.textContent = "🌙 Dark Mode";
      toggleBtn.classList.remove("btn-outline-warning");
      toggleBtn.classList.add("btn-outline-light");
    }
  });