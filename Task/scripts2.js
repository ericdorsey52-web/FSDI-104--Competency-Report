const API_URL = "https://jsonplaceholder.typicode.com/todos"; // Mock API
const USER_ID = 1; // Simulate a logged-in user

// Load tasks on page load
$(document).ready(function () {
    loadTasks();

    // Handle form submit
    $("#taskForm").on("submit", function (e) {
        e.preventDefault();
        const taskText = $("#taskText").val().trim();

        if (taskText === "") {
          $("#taskText").addClass("is-invalid");
          return;
        }
        $("#taskText").removeClass("is-invalid");

        const newTask = {
          userId: USER_ID,
          title: taskText,
          completed: false
        };

        $.post(API_URL, newTask, function (data) {
          displayTask(data);
          $("#taskText").val("");
        });
    });

    // Delete all tasks
    $("#deleteAll").on("click", function () {
        $("#taskList").empty();
        // In a real API, you’d send a DELETE request for each task
        alert("All tasks deleted (locally).");
    });
});

// Retrieve tasks from API
function loadTasks() {
  $.get(API_URL + "?userId=" + USER_ID, function (tasks) {
    $("#taskList").empty();
    tasks.slice(0, 5).forEach(task => displayTask(task)); // show first 5 for demo
    });
}

    // Display a single task
    function displayTask(task) {
      const card = `
        <div class="col-md-4">
          <div class="card task-card p-3">
            <h5>${task.title}</h5>
            <p>Status: ${task.completed ? "✅ Completed" : "❌ Pending"}</p>
          </div>
        </div>
      `;
      $("#taskList").append(card);
    }