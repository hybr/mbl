import { MiniApp } from "../../core/MiniApp.js";

class SkillManagementApp extends MiniApp {
  constructor(options = {}) {
    super({
      name: "SkillManagementApp",
      ...options,
    });
    // State
    this.skills = [];
    this.currentSkill = null;
    this.currentUser = null;
    this.currentView = "list"; // list, edit
    this.skillLevels = ["Beginner", "Intermediate", "Expert"];
    this.components = {};
    this.availableSkills = [];
  }
  // Initialize app, subscribe to data and auth events
  async onInit() {
    // Load reference skill data (foreign key)
    try {
      const resp = await fetch('/data/skills.json');
      this.availableSkills = await resp.json();
    } catch (e) {
      this.availableSkills = [];
      this.logger.warn('Failed to load reference skill data.');
    }
    // Index for skills by type, userId
    await this.db.createIndex(["type", "userId"]);
    // Subscribe to skill changes
    this.subscribeToData("skill", (change) => this.handleSkillChange(change));
    this.subscribe("person:login", (user) => {
      this.currentUser = user;
      this.loadSkills();
      if (this.isRendered) this.render();
    });
    this.subscribe("person:logout", () => {
      this.currentUser = null;
      this.skills = [];
      if (this.isRendered) this.render();
    });
    // Get logged in user if any (for reload)
    await this.checkCurrentUser();
    if (this.currentUser) {
      await this.loadSkills();
    }
  }
  async checkCurrentUser() {
    try {
      const sessionData = localStorage.getItem("personManagementApp_session");
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const result = await this.db.query({
          selector: { type: "person", _id: session.userId },
        });
        if (result && result.length > 0) {
          this.currentUser = result[0];
        }
      }
    } catch {}
  }
  async loadSkills() {
    if (!this.currentUser) {
      this.skills = [];
      return;
    }
    try {
      const result = await this.db.query({
        selector: { type: "skill", userId: this.currentUser._id },
      });
      this.skills = result.docs || result;
      if (this.isRendered) this.render();
    } catch (e) {
      this.skills = [];
      this.showError("Failed to load skills");
    }
  }
  handleSkillChange(change) {
    if (change.deleted) {
      this.skills = this.skills.filter((s) => s._id !== change.id);
    } else {
      const idx = this.skills.findIndex((s) => s._id === change.doc._id);
      if (idx >= 0) this.skills[idx] = change.doc;
      else this.skills.push(change.doc);
    }
    if (this.isRendered && this.currentView === "list") this.render();
  }
  getSkillNameByCode(code) {
    const s = this.availableSkills.find(x => x.code === code);
    return s ? s.name : code;
  }
  // RENDER
  async onRender() {
    this.clearContainer();
    switch (this.currentView) {
      case "list":
        this.renderListView();
        break;
      case "edit":
        this.renderEditView();
        break;
    }
  }
  renderListView() {
    const header = this.createElement("div", { className: "miniapp-header" });
    const title = this.createElement("h2", {}, ["Skill Management"]);
    header.appendChild(title);
    if (this.currentUser) {
      const userInfo = this.createElement("div", { className: "user-info" }, [
        `Logged in as: ${this.currentUser.username}`,
      ]);
      header.appendChild(userInfo);
    }
    const actions = this.createElement("div", { className: "skill-actions" });
    this.components.addBtn = this.createElement(
      "button",
      {
        className: "btn btn-primary",
        onclick: () => this.showEditView(null),
      },
      ["+ Add Skill"]
    );
    actions.appendChild(this.components.addBtn);
    const listContainer = this.createElement("div", { className: "skill-list-container" });
    if (!this.currentUser) {
      listContainer.appendChild(this.createElement("div", {}, [
        "Login to manage your skills."
      ]));
    } else if (!this.skills.length) {
      listContainer.appendChild(this.createElement("div", {}, [
        "No skills found. Add your first skill!"
      ]));
    } else {
      this.skills.forEach((skill) => {
        listContainer.appendChild(this.renderSkillCard(skill));
      });
    }
    this.container.appendChild(header);
    this.container.appendChild(actions);
    this.container.appendChild(listContainer);
  }
  renderSkillCard(skill) {
    const card = this.createElement("div", { className: "skill-card" });
    const name = this.createElement("div", { className: "skill-card-name" }, [this.getSkillNameByCode(skill.skillCode)]);
    const details = this.createElement("div", { className: "skill-card-details" }, [
      `Level: ${skill.skillLevel}`,
      skill.description ? this.createElement("div", {}, [skill.description]) : null,
      skill.status ? this.createElement("div", {}, [`Status: ${skill.status}`]) : null,
    ]);
    const actions = this.createElement("div", { className: "skill-card-actions" });
    const editBtn = this.createElement(
      "button",
      {
        className: "btn btn-small btn-secondary",
        onclick: () => this.showEditView(skill._id),
      },
      ["Edit"]
    );
    const delBtn = this.createElement(
      "button",
      {
        className: "btn btn-small btn-danger",
        onclick: () => this.deleteSkill(skill),
      },
      ["Delete"]
    );
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    card.appendChild(name);
    card.appendChild(details);
    card.appendChild(actions);
    return card;
  }
  renderEditView() {
    const isNew = !this.currentSkill;
    const header = this.createElement("div", { className: "miniapp-header" });
    const title = this.createElement("h2", {}, [isNew ? "Add Skill" : "Edit Skill"]);
    const backBtn = this.createElement("button", {
      className: "btn btn-small",
      onclick: () => this.showListView(),
    }, ["← Back to List"]);
    header.appendChild(backBtn);
    header.appendChild(title);
    // Skill Form
    const form = this.createElement("form", {
      className: "skill-form",
      onsubmit: (e) => {
        e.preventDefault();
        this.saveCurrentSkill();
      },
    });
    // SKILL (foreign key dropdown)
    const nameGroup = this.createElement("div", { className: "form-group" });
    nameGroup.appendChild(this.createElement("label", {}, ["Skill Name *"]));
    const codeSelect = this.createElement("select", {
      name: "skillCode",
      className: "input",
      required: true,
    });
    // Add "Choose..." option
    const chooseOpt = this.createElement("option", { value: "" }, ["-- Choose Skill --"]);
    codeSelect.appendChild(chooseOpt);
    (this.availableSkills ?? []).forEach(skill => {
      const opt = this.createElement("option", {
        value: skill.code,
        selected: this.currentSkill && this.currentSkill.skillCode === skill.code,
      }, [skill.name]);
      codeSelect.appendChild(opt);
    });
    nameGroup.appendChild(codeSelect);
    // SKILL LEVEL
    const levelGroup = this.createElement("div", { className: "form-group" });
    levelGroup.appendChild(this.createElement("label", {}, ["Skill Level *"]));
    const levelSelect = this.createElement("select", {
      name: "skillLevel",
      className: "input",
      required: true,
    });
    this.skillLevels.forEach((level) => {
      const opt = this.createElement("option", {
        value: level,
        selected: this.currentSkill && this.currentSkill.skillLevel === level,
      }, [level]);
      levelSelect.appendChild(opt);
    });
    levelGroup.appendChild(levelSelect);
    // Description
    const descGroup = this.createElement("div", { className: "form-group" });
    descGroup.appendChild(this.createElement("label", {}, ["Description"]));
    descGroup.appendChild(this.createElement("textarea", {
      name: "description",
      className: "input",
      placeholder: "Describe your skill (optional)",
    }, [this.currentSkill ? this.currentSkill.description : ""]));
    // Status
    const statusGroup = this.createElement("div", { className: "form-group" });
    statusGroup.appendChild(this.createElement("label", {}, ["Status"]));
    const statusInput = this.createElement("input", {
      name: "status",
      className: "input",
      placeholder: "e.g. Active, Inactive...",
      value: this.currentSkill ? this.currentSkill.status : "",
    });
    statusGroup.appendChild(statusInput);
    // Form actions
    const formActions = this.createElement("div", { className: "form-actions" });
    const saveBtn = this.createElement("button", {
      className: "btn btn-primary",
      type: "submit",
    }, [isNew ? "Add Skill" : "Update Skill"]);
    const cancelBtn = this.createElement("button", {
      className: "btn btn-secondary",
      type: "button",
      onclick: () => this.showListView(),
    }, ["Cancel"]);
    formActions.appendChild(saveBtn);
    formActions.appendChild(cancelBtn);
    // Assemble form
    form.appendChild(nameGroup);
    form.appendChild(levelGroup);
    form.appendChild(descGroup);
    form.appendChild(statusGroup);
    form.appendChild(formActions);
    // Main assembly
    this.container.appendChild(header);
    this.container.appendChild(form);
    // Populate if editing
    if (this.currentSkill) {
      codeSelect.value = this.currentSkill.skillCode;
      levelSelect.value = this.currentSkill.skillLevel;
      descGroup.querySelector("textarea").value = this.currentSkill.description || "";
      statusInput.value = this.currentSkill.status || "";
    }
  }
  async showEditView(skillId) {
    if (skillId) {
      this.currentSkill = await this.db.read(skillId);
    } else {
      this.currentSkill = null;
    }
    this.currentView = "edit";
    this.render();
  }
  showListView() {
    this.currentSkill = null;
    this.currentView = "list";
    this.render();
  }
  async saveCurrentSkill() {
    if (!this.currentUser) {
      this.showError("Not logged in");
      return;
    }
    const form = this.container.querySelector(".skill-form");
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.skillCode || !data.skillLevel) {
      this.showError("Skill and Level required");
      return;
    }
    try {
      if (this.currentSkill) {
        // Update
        const updated = {
          ...this.currentSkill,
          ...data,
          updatedAt: new Date().toISOString(),
        };
        await this.db.update(updated);
        this.showSuccess("Skill updated successfully");
      } else {
        // Create
        const newSkill = {
          _id: `skill:${this.generateUUID()}`,
          type: "skill",
          userId: this.currentUser._id,
          userName: this.currentUser.fullName || this.currentUser.username,
          skillCode: data.skillCode,
          skillLevel: data.skillLevel,
          description: data.description || "",
          status: data.status || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await this.db.create(newSkill);
        this.showSuccess("Skill added successfully");
      }
      this.showListView();
      this.loadSkills();
    } catch (e) {
      this.showError("Failed to save skill");
    }
  }
  async deleteSkill(skill) {
    const displayText = this.getSkillNameByCode(skill.skillCode);
    if (!confirm(`Delete skill: ${displayText}?`)) return;
    try {
      await this.db.delete(skill);
      this.showSuccess("Skill deleted successfully");
      this.showListView();
      this.loadSkills();
    } catch {
      this.showError("Failed to delete skill");
    }
  }
  generateUUID() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  onDestroy() { this.skills = []; this.currentSkill = null; this.currentUser = null; }
}
export { SkillManagementApp };
