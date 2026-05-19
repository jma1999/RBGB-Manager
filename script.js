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

const taskModal = document.getElementById("task-modal");
const openTaskModal = document.getElementById("open-task-modal");
const closeTaskModal = document.getElementById("close-task-modal");
const saveTaskButton = document.getElementById("save-task");

const detailPanel = document.getElementById("detail-panel");
const closeDetailPanel = document.getElementById("close-detail-panel");
const saveCommentButton = document.getElementById("save-comment");
const updateStatusButton = document.getElementById("update-status");
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

saveTaskButton.addEventListener("click", async () => {
  const title = document.getElementById("task-title").value.trim();
  const description = document.getElementById("task-description").value.trim();
  const dueDate = document.getElementById("task-due-date").value;
  const status = document.getElementById("task-status").value;
  const priority = document.getElementById("task-priority").value;
  const assignedTo = document.getElementById("task-assigned-to").value.trim();

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
}

function startRealtimeTaskListener() {
  const tasksQuery = query(collection(db, "tasks"), orderBy("createdAt", "desc"));

  onSnapshot(tasksQuery, (snapshot) => {
    allTasks = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    renderStats();
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

function renderTasks() {
  taskList.innerHTML = "";

  const filteredTasks =
    currentFilter === "all"
      ? allTasks
      : allTasks.filter((task) => task.status === currentFilter);

  if (filteredTasks.length === 0) {
    taskList.innerHTML = "<p>No tasks here yet.</p>";
    return;
  }

  filteredTasks.forEach((task) => {
    const card = document.createElement("article");
    card.className = "task-card";
    const commentCount = task.commentCount || 0;
    const latestComment = task.latestComment || "";

    card.innerHTML = `
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
              <strong>Latest comment:</strong>
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

function openTaskDetails(task) {
  selectedTaskId = task.id;

  document.getElementById("detail-title").textContent = task.title;
  document.getElementById("detail-description").textContent =
    task.description || "No description added.";
  document.getElementById("detail-due-date").textContent =
    task.dueDate || "No due date";
  document.getElementById("detail-status").textContent = formatStatus(task.status);
  document.getElementById("detail-priority").textContent = formatPriority(task.priority);
  document.getElementById("detail-assigned-to").textContent =
    task.assignedTo || "Unassigned";

  document.getElementById("detail-status-select").value = task.status;

  detailPanel.classList.remove("hidden");

  startRealtimeCommentListener(task.id);
}

updateStatusButton.addEventListener("click", async () => {
  if (!selectedTaskId) return;

  const newStatus = document.getElementById("detail-status-select").value;

  await updateDoc(doc(db, "tasks", selectedTaskId), {
    status: newStatus,
    updatedAt: serverTimestamp()
  });

  document.getElementById("detail-status").textContent = formatStatus(newStatus);
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

        const commentElement = window.document.createElement("div");
        commentElement.className = "comment";

        commentElement.innerHTML = `
          <p>${escapeHTML(comment.text || "")}</p>
          <small>By ${escapeHTML(comment.author || "Office User")}</small>
        `;

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