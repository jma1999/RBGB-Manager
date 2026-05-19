const owner = "jma1999";
const repo = "RBGB-Manager";

const newTaskButton = document.getElementById("new-task-button");

newTaskButton.href = `https://github.com/${owner}/${repo}/issues/new?title=New%20Task&body=Due%20date:%20%0A%0ADescription:%20%0A%0AChecklist:%20%0A-%20%5B%20%5D%20`;

const columns = {
  "todo": document.getElementById("todo"),
  "in-progress": document.getElementById("in-progress"),
  "blocked": document.getElementById("blocked"),
  "done": document.getElementById("done")
};

async function fetchIssues() {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100`;

  try {
    const response = await fetch(url);
    const issues = await response.json();

    clearColumns();

    issues
      .filter(issue => !issue.pull_request)
      .forEach(issue => {
        const status = getStatus(issue.labels);
        const card = createTaskCard(issue);
        columns[status].appendChild(card);
      });

  } catch (error) {
    console.error("Error loading issues:", error);
  }
}

function clearColumns() {
  Object.values(columns).forEach(column => {
    column.innerHTML = "";
  });
}

function getStatus(labels) {
  const labelNames = labels.map(label => label.name);

  if (labelNames.includes("in-progress")) return "in-progress";
  if (labelNames.includes("blocked")) return "blocked";
  if (labelNames.includes("done")) return "done";

  return "todo";
}

function createTaskCard(issue) {
  const card = document.createElement("div");
  card.className = "task-card";

  const dueDate = extractDueDate(issue.body);

  const labels = issue.labels
    .map(label => `<span class="label">${label.name}</span>`)
    .join("");

  card.innerHTML = `
    <h3>${issue.title}</h3>
    <p><strong>Due:</strong> ${dueDate || "No due date set"}</p>
    <p><strong>Comments:</strong> ${issue.comments}</p>
    <div>${labels}</div>
    <a href="${issue.html_url}" target="_blank" rel="noopener noreferrer">
      Open / Comment
    </a>
  `;

  return card;
}

function extractDueDate(body) {
  if (!body) return null;

  const match = body.match(/Due date:\s*(.*)/i);
  return match && match[1] ? match[1].trim() : null;
}

fetchIssues();

// Refresh every 30 seconds
setInterval(fetchIssues, 30000);