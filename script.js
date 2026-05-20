import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD9JSB9s-xV-IMWmKNbuij6yJ-swo3dlZ0",
  authDomain: "rbgb-manager.firebaseapp.com",
  projectId: "rbgb-manager",
  storageBucket: "rbgb-manager.firebasestorage.app",
  messagingSenderId: "69292993076",
  appId: "1:69292993076:web:2ed8e9959999202ad4b861",
  measurementId: "G-SS1XF5W3ZT"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const OFFICE_PASSCODE = "rbgb";

let allTasks = [];
let currentFilter = "all";
let currentProjectFilter = "all";
let currentSort = "newest";
let selectedTaskId = null;
let unsubscribeComments = null;
let currentUserName = "Office User";

const lockScreen = document.getElementById("lock-screen");
const appScreen = document.getElementById("app");

const userNameInput = document.getElementById("user-name-input");
const passcodeInput = document.getElementById("passcode-input");
const unlockButton = document.getElementById("unlock-button");
const passcodeError = document.getElementById("passcode-error");

const taskList = document.getElementById("task-list");
const projectFilter = document.getElementById("project-filter");
const taskSort = document.getElementById("task-sort");

const taskModal = document.getElementById("task-modal");
const openTaskModal = document.getElementById("open-task-modal");
const closeTaskModal = document.getElementById("close-task-modal");
const saveTaskButton = document.getElementById("save-task");

const detailPanel = document.getElementById("detail-panel");
const closeDetailPanel = document.getElementById("close-detail-panel");
const saveCommentButton = document.getElementById("save-comment");
const saveTaskEditsButton = document.getElementById("save-task-edits");
const deleteTaskButton = document.getElementById("delete-task");

unlockButton.addEventListener("click", unlockApp);

passcodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    unlockApp();
  }
});

function unlockApp() {
  const typedName = userNameInput.value.trim();

  if (!typedName) {
    passcodeError.textContent = "Please enter your name.";
    return;
  }

  if (passcodeInput.value === OFFICE_PASSCODE) {
    currentUserName = typedName;

    lockScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    startRealtimeTaskListener();
  } else {
    passcodeError.textContent = "Incorrect passcode. Try again.";
  }
}

openTaskModal.addEventListener("click", () => {
  taskModal.classList.remove("hidden");
});

closeTaskModal.addEventListener("click", () => {
  taskModal.classList.add("hidden");
});

closeDetailPanel.addEventListener("click", () => {
  detailPanel.classList.add("hidden");
});

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    currentFilter = button.dataset.filter;
    renderTasks();
  });
});

projectFilter.addEventListener("change", () => {
  currentProjectFilter = projectFilter.value;
  renderTasks();
});

taskSort.addEventListener("change", () => {
  currentSort = taskSort.value;
  renderTasks();
});

saveTaskButton.addEventListener("click", async () => {
  const title = document.getElementById("task-title").value.trim();
  const description = document.getElementById("task-description").value.trim();
  const dueDate = document.getElementById("task-due-date").value;
  const status = document.getElementById("task-status").value;
  const priority = document.getElementById("task-priority").value;
  const assignedTo = document.getElementById("task-assigned-to").value.trim();
  const project = document.getElementById("task-project").value.trim();

  if (!title) {
    alert("Please add a task title.");
    return;
  }

  await addDoc(collection(db, "tasks"), {
    title,
    description,
    dueDate,
    status,
    priority,
    assignedTo,
    project,
    commentCount: 0,
    latestComment: "",
    latestCommentAuthor: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  clearTaskForm();
  taskModal.classList.add("hidden");
});

function clearTaskForm() {
  document.getElementById("task-title").value = "";
  document.getElementById("task-description").value = "";
  document.getElementById("task-due-date").value = "";
  document.getElementById("task-status").value = "todo";
  document.getElementById("task-priority").value = "medium";
  document.getElementById("task-assigned-to").value = "";
  document.getElementById("task-project").value = "";
}

function startRealtimeTaskListener() {
  const tasksQuery = query(collection(db, "tasks"), orderBy("createdAt", "desc"));

  onSnapshot(tasksQuery, (snapshot) => {
    allTasks = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    renderStats();
    renderProjectFilter();
    renderTasks();
  });
}

function renderStats() {
  document.getElementById("total-count").textContent = allTasks.length;
  document.getElementById("progress-count").textContent =
    allTasks.filter((task) => task.status === "in-progress").length;
  document.getElementById("waiting-count").textContent =
    allTasks.filter((task) => task.status === "waiting").length;
  document.getElementById("blocked-count").textContent =
    allTasks.filter((task) => task.status === "blocked").length;
}

function renderProjectFilter() {
  const existingValue = projectFilter.value;

  const projects = [...new Set(
    allTasks
      .map((task) => task.project)
      .filter((project) => project && project.trim() !== "")
  )].sort();

  projectFilter.innerHTML = `<option value="all">All Projects</option>`;

  projects.forEach((project) => {
    const option = document.createElement("option");
    option.value = project;
    option.textContent = project;
    projectFilter.appendChild(option);
  });

  if (projects.includes(existingValue)) {
    projectFilter.value = existingValue;
  } else {
    projectFilter.value = "all";
    currentProjectFilter = "all";
  }
}

function renderTasks() {
  taskList.innerHTML = "";

  let filteredTasks =
    currentFilter === "all"
      ? [...allTasks]
      : allTasks.filter((task) => task.status === currentFilter);

  if (currentProjectFilter !== "all") {
    filteredTasks = filteredTasks.filter(
      (task) => task.project === currentProjectFilter
    );
  }

  filteredTasks = sortTasks(filteredTasks);

  if (filteredTasks.length === 0) {
    taskList.innerHTML = "<p>No tasks here yet.</p>";
    return;
  }

  filteredTasks.forEach((task) => {
    const card = document.createElement("article");

    const isOverdue = checkIsOverdue(task);

    card.className = isOverdue
      ? "task-card overdue-card"
      : "task-card";

    const commentCount = task.commentCount || 0;
    const latestComment = task.latestComment || "";
    const latestCommentAuthor = task.latestCommentAuthor || "";

    card.innerHTML = `
      <div class="task-card-header">
        <span class="project-label">${escapeHTML(task.project || "No Project")}</span>
        ${
          isOverdue
            ? `<span class="overdue-label">Overdue</span>`
            : ""
        }
      </div>

      <h3>${escapeHTML(task.title)}</h3>
      <p>${escapeHTML(task.description || "No description added.")}</p>

      <div class="card-meta">
        <span class="pill">${formatStatus(task.status)}</span>
        <span class="pill ${task.priority}">${formatPriority(task.priority)}</span>
        <span class="pill">Due: ${task.dueDate || "No date"}</span>
        <span class="pill">${commentCount} comment${commentCount === 1 ? "" : "s"}</span>
      </div>

      ${
        latestComment
          ? `<div class="latest-comment">
              <strong>Latest comment${latestCommentAuthor ? ` by ${escapeHTML(latestCommentAuthor)}` : ""}:</strong>
              <p>${escapeHTML(latestComment)}</p>
            </div>`
          : ""
      }
    `;

    card.addEventListener("click", () => {
      openTaskDetails(task);
    });

    taskList.appendChild(card);
  });
}

function sortTasks(tasks) {
  const priorityRank = {
    high: 3,
    medium: 2,
    low: 1
  };

  if (currentSort === "priority") {
    return tasks.sort((a, b) => {
      const priorityA = priorityRank[a.priority] || 0;
      const priorityB = priorityRank[b.priority] || 0;

      return priorityB - priorityA;
    });
  }

  if (currentSort === "due-date") {
    return tasks.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;

      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }

  return tasks;
}

function checkIsOverdue(task) {
  if (!task.dueDate) return false;
  if (task.status === "done") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
}

function openTaskDetails(task) {
  selectedTaskId = task.id;

  document.getElementById("detail-title-input").value = task.title || "";
  document.getElementById("detail-description-input").value = task.description || "";
  document.getElementById("detail-due-date-input").value = task.dueDate || "";
  document.getElementById("detail-status-select").value = task.status || "todo";
  document.getElementById("detail-priority-select").value = task.priority || "medium";
  document.getElementById("detail-assigned-to-input").value = task.assignedTo || "";
  document.getElementById("detail-project-input").value = task.project || "";

  detailPanel.classList.remove("hidden");

  startRealtimeCommentListener(task.id);
}

saveTaskEditsButton.addEventListener("click", async () => {
  if (!selectedTaskId) {
    alert("No task selected.");
    return;
  }

  const title = document.getElementById("detail-title-input").value.trim();
  const description = document.getElementById("detail-description-input").value.trim();
  const dueDate = document.getElementById("detail-due-date-input").value;
  const status = document.getElementById("detail-status-select").value;
  const priority = document.getElementById("detail-priority-select").value;
  const assignedTo = document.getElementById("detail-assigned-to-input").value.trim();
  const project = document.getElementById("detail-project-input").value.trim();

  if (!title) {
    alert("Task title cannot be empty.");
    return;
  }

  try {
    await updateDoc(doc(db, "tasks", selectedTaskId), {
      title,
      description,
      dueDate,
      status,
      priority,
      assignedTo,
      project,
      updatedAt: serverTimestamp()
    });

    alert("Task updated.");
  } catch (error) {
    console.error("Error updating task:", error);
    alert("Task could not be updated. Check the console.");
  }
});

deleteTaskButton.addEventListener("click", async () => {
  if (!selectedTaskId) {
    alert("No task selected.");
    return;
  }

  const confirmDelete = confirm(
    "Are you sure you want to delete this task? This cannot be undone."
  );

  if (!confirmDelete) {
    return;
  }

  try {
    const commentsSnapshot = await getDocs(
      collection(db, "tasks", selectedTaskId, "comments")
    );

    const deleteCommentPromises = commentsSnapshot.docs.map((commentDoc) =>
      deleteDoc(doc(db, "tasks", selectedTaskId, "comments", commentDoc.id))
    );

    await Promise.all(deleteCommentPromises);

    await deleteDoc(doc(db, "tasks", selectedTaskId));

    selectedTaskId = null;
    detailPanel.classList.add("hidden");

    alert("Task deleted.");
  } catch (error) {
    console.error("Error deleting task:", error);
    alert("Task could not be deleted. Check the console.");
  }
});

saveCommentButton.addEventListener("click", async () => {
  if (!selectedTaskId) {
    alert("No task selected.");
    return;
  }

  const commentInput = document.getElementById("comment-input");
  const text = commentInput.value.trim();

  if (!text) {
    alert("Please type a comment first.");
    return;
  }

  try {
    await addDoc(collection(db, "tasks", selectedTaskId, "comments"), {
      text,
      author: currentUserName,
      createdAt: serverTimestamp()
    });

    await updateDoc(doc(db, "tasks", selectedTaskId), {
      commentCount: increment(1),
      latestComment: text,
      latestCommentAuthor: currentUserName,
      updatedAt: serverTimestamp()
    });

    commentInput.value = "";
  } catch (error) {
    console.error("Error adding comment:", error);
    alert("Comment could not be saved. Check the console.");
  }
});

function startRealtimeCommentListener(taskId) {
  const commentsList = document.getElementById("comments-list");
  commentsList.innerHTML = "<p>Loading comments...</p>";

  if (unsubscribeComments) {
    unsubscribeComments();
  }

  const commentsQuery = query(
    collection(db, "tasks", taskId, "comments"),
    orderBy("createdAt", "asc")
  );

  unsubscribeComments = onSnapshot(
    commentsQuery,
    (snapshot) => {
      commentsList.innerHTML = "";

      if (snapshot.empty) {
        commentsList.innerHTML = "<p>No comments yet.</p>";
        return;
      }

      snapshot.docs.forEach((docSnap) => {
        const comment = docSnap.data();

        const commentElement = document.createElement("div");
        commentElement.className = "comment";

        commentElement.innerHTML = `
          <p>${escapeHTML(comment.text || "")}</p>
          <small>
            By ${escapeHTML(comment.author || "Office User")}
            ${comment.editedAt ? " · edited" : ""}
          </small>
          <button class="edit-comment-button">Edit</button>
        `;

        const editButton = commentElement.querySelector(".edit-comment-button");

        editButton.addEventListener("click", async (event) => {
          event.stopPropagation();

          const updatedText = prompt("Edit comment:", comment.text || "");

          if (updatedText === null) return;

          const cleanText = updatedText.trim();

          if (!cleanText) {
            alert("Comment cannot be empty.");
            return;
          }

          try {
            await updateDoc(
              doc(db, "tasks", taskId, "comments", docSnap.id),
              {
                text: cleanText,
                editedAt: serverTimestamp()
              }
            );

            await updateLatestCommentAfterEdit(taskId);
          } catch (error) {
            console.error("Error editing comment:", error);
            alert("Comment could not be edited. Check the console.");
          }
        });

        commentsList.appendChild(commentElement);
      });
    },
    (error) => {
      console.error("Comment listener error:", error);
      commentsList.innerHTML =
        "<p>Could not load comments. Check Firestore rules or console errors.</p>";
    }
  );
}

async function updateLatestCommentAfterEdit(taskId) {
  const commentsQuery = query(
    collection(db, "tasks", taskId, "comments"),
    orderBy("createdAt", "desc")
  );

  const commentsSnapshot = await getDocs(commentsQuery);

  if (commentsSnapshot.empty) {
    await updateDoc(doc(db, "tasks", taskId), {
      latestComment: "",
      latestCommentAuthor: "",
      commentCount: 0,
      updatedAt: serverTimestamp()
    });

    return;
  }

  const latestCommentDoc = commentsSnapshot.docs[0];
  const latestComment = latestCommentDoc.data();

  await updateDoc(doc(db, "tasks", taskId), {
    latestComment: latestComment.text || "",
    latestCommentAuthor: latestComment.author || "",
    updatedAt: serverTimestamp()
  });
}

function formatStatus(status) {
  const statuses = {
    "todo": "To Do",
    "in-progress": "In Progress",
    "waiting": "Waiting",
    "blocked": "Blocked",
    "done": "Done"
  };

  return statuses[status] || "To Do";
}

function formatPriority(priority) {
  const priorities = {
    "low": "Low Priority",
    "medium": "Medium Priority",
    "high": "High Priority"
  };

  return priorities[priority] || "Medium Priority";
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}