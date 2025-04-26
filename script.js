let folders = [];
let allFeatures = new Set();
let entityList = [];
const STORAGE_KEY = 'entityAppData';

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
}

function loadData() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) folders = JSON.parse(data);
}

function updateFeatureSuggestions() {
  const datalist = document.getElementById("featureSuggestions");
  datalist.innerHTML = "";
  allFeatures.forEach(f => {
    const option = document.createElement("option");
    option.value = f;
    datalist.appendChild(option);
  });
}

function addFolder(parentFolder) {
  const input = document.getElementById("folderName");
  const name = parentFolder ? prompt("Folder name:") : input.value.trim();
  if (!name) return;

  const newFolder = { name, folders: [], entities: [], collapsed: false };
  if (parentFolder) parentFolder.folders.push(newFolder);
  else {
    folders.push(newFolder);
    input.value = '';
  }
  renderFolders();
  saveData();
}

function renderFolders() {
  const container = document.getElementById("folderContainer");
  container.innerHTML = '';
  folders.forEach(f => container.appendChild(renderFolder(f)));
  entityList = [];
  collectEntities(folders, entityList);
  updateAllFeatures();
  updateFeatureSuggestions();
  saveData();
}

function renderFolder(folder, parent = null) {
  const div = document.createElement("div");
  div.className = "folder";

  const titleLine = document.createElement("div");

  const toggleBtn = document.createElement("span");
  toggleBtn.textContent = folder.collapsed ? "[+]" : "[-]";
  toggleBtn.className = "toggle-btn";
  toggleBtn.onclick = () => {
    folder.collapsed = !folder.collapsed;
    renderFolders();
  };
  titleLine.appendChild(toggleBtn);

  const title = document.createElement("span");
  title.innerHTML = `<b>${folder.name}</b>`;
  titleLine.appendChild(title);

  const menuBtn = document.createElement("button");
  menuBtn.textContent = "⋮";
  menuBtn.className = "menu-button";
  const menu = document.createElement("div");
  menu.className = "menu";

  [
    { text: 'Rename', handler: () => {
      const newName = prompt('New folder name:', folder.name);
      if (newName) {
        folder.name = newName;
        renderFolders();
      }
    }},
    { text: 'Delete', handler: () => {
      if (confirm("Delete this folder?")) {
        if (parent) parent.folders = parent.folders.filter(f => f !== folder);
        else folders = folders.filter(f => f !== folder);
        renderFolders();
      }
    }},
    { text: '+ Subfolder', handler: () => addFolder(folder) },
    { text: '+ Entity', handler: () => {
      const name = prompt("Entity name:");
      if (!name) return;
      folder.entities.push({ name, features: {} });
      renderFolders();
    }}
  ].forEach(item => {
    const btn = document.createElement("button");
    btn.textContent = item.text;
    btn.onclick = () => {
      item.handler();
      menu.style.display = "none";
    };
    menu.appendChild(btn);
  });

  menuBtn.onclick = (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === "block" ? "none" : "block";
  };

  titleLine.appendChild(menuBtn);
  titleLine.appendChild(menu);
  div.appendChild(titleLine);

  if (!folder.collapsed) {
    folder.entities.forEach(e => div.appendChild(renderEntity(e)));
    folder.folders.forEach(sub => div.appendChild(renderFolder(sub, folder)));
  }

  return div;
}

function renderEntity(entity) {
  const div = document.createElement("div");
  div.className = "entity";

  const name = document.createElement("span");
  name.innerHTML = `<u>${entity.name}</u>`;
  div.appendChild(name);

  const menuBtn = document.createElement("button");
  menuBtn.textContent = "⋮";
  menuBtn.className = "menu-button";
  const menu = document.createElement("div");
  menu.className = "menu";

  [
    { text: '+ Feature', handler: () => {
      const feature = prompt('Feature name:');
      const value = prompt('Value:');
      if (feature && value !== null) {
        entity.features[feature] = value;
        allFeatures.add(feature);
        renderFolders();
      }
    }},
    { text: 'Rename', handler: () => {
      const newName = prompt('New entity name:', entity.name);
      if (newName) {
        entity.name = newName;
        renderFolders();
      }
    }},
    { text: 'Delete', handler: () => {
      if (confirm("Delete this entity?")) {
        for (let f of folders) removeEntityRecursive(f, entity);
        renderFolders();
      }
    }}
  ].forEach(item => {
    const btn = document.createElement("button");
    btn.textContent = item.text;
    btn.onclick = () => {
      item.handler();
      menu.style.display = "none";
    };
    menu.appendChild(btn);
  });

  menuBtn.onclick = (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === "block" ? "none" : "block";
  };

  div.appendChild(menuBtn);
  div.appendChild(menu);

  for (let key in entity.features) {
    const featureDiv = document.createElement("div");
    featureDiv.className = "feature";

    const inputKey = document.createElement("input");
    inputKey.value = key;
    inputKey.setAttribute("list", "featureSuggestions");

    const inputValue = document.createElement("input");
    inputValue.value = entity.features[key];

    inputKey.addEventListener("keydown", e => {
      if (e.key === "Enter") inputValue.focus();
    });

    inputValue.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        const newKey = inputKey.value;
        const newValue = inputValue.value;
        delete entity.features[key];
        entity.features[newKey] = newValue;
        allFeatures.add(newKey);
        renderFolders();
      }
    });

    featureDiv.appendChild(inputKey);
    featureDiv.appendChild(document.createTextNode(": "));
    featureDiv.appendChild(inputValue);
    div.appendChild(featureDiv);
  }

  return div;
}

function removeEntityRecursive(folder, entity) {
  folder.entities = folder.entities.filter(e => e !== entity);
  folder.folders.forEach(sub => removeEntityRecursive(sub, entity));
}

function collectEntities(folderList, result) {
  folderList.forEach(f => {
    result.push(...f.entities);
    collectEntities(f.folders, result);
  });
}

function updateAllFeatures() {
  allFeatures.clear();
  entityList.forEach(e => {
    Object.keys(e.features).forEach(f => allFeatures.add(f));
  });
}

function compareByName() {
  const input = document.getElementById("compareInput").value.trim();
  if (!input) {
    alert("Please enter at least two entity names.");
    return;
  }

  const names = input.split(",").map(n => n.trim()).filter(Boolean);
  if (names.length < 2) {
    alert("At least two entities required.");
    return;
  }

  const selected = entityList.filter(e => names.includes(e.name));
  if (selected.length < 2) {
    alert("Not enough entities found.");
    return;
  }

  const allKeys = new Set();
  selected.forEach(e => Object.keys(e.features).forEach(k => allKeys.add(k)));

  const table = document.createElement("table");
  const header = document.createElement("tr");
  header.innerHTML = "<th>Feature</th>" + selected.map(e => `<th>${e.name}</th>`).join('');
  table.appendChild(header);

  allKeys.forEach(key => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${key}</td>` + selected.map(e => `<td>${e.features[key] || ""}</td>`).join('');
    table.appendChild(row);
  });

  const result = document.getElementById("comparisonResult");
  result.innerHTML = "";
  result.appendChild(table);
}

window.onload = () => {
  loadData();
  renderFolders();
};
