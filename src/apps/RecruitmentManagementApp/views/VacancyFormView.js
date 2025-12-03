/**
 * VacancyFormView.js
 * Renders the vacancy creation/edit form
 * Note: This is a large form extracted from the main file for better organization
 */

import { VACANCY_STATUS_OPTIONS } from '../constants.js';

export function renderVacancyFormView(app) {
  const isNew = !app.currentVacancy;

  if (!app.defaultOrganization) {
    const message = app.createElement('div', { className: 'info-message' }, [
      'Please set a default organization to create vacancies.'
    ]);
    app.container.appendChild(message);
    return;
  }

  const header = app.createElement('div', { className: 'miniapp-header' });
  const title = app.createElement('h2', {}, [isNew ? 'Create Vacancy' : 'Edit Vacancy']);
  const backBtn = app.createElement('button', {
    className: 'btn btn-small',
    onclick: () => {
      app.currentView = 'org-vacancies';
      app.render();
    }
  }, ['← Back']);
  header.appendChild(backBtn);
  header.appendChild(title);

  const form = app.createElement('form', {
    className: 'vacancy-form',
    onsubmit: (e) => {
      e.preventDefault();
      app.saveVacancy();
    }
  });

  // Title
  const titleGroup = app.createElement('div', { className: 'form-group' });
  titleGroup.appendChild(app.createElement('label', {}, ['Job Title *']));
  const titleInput = app.createElement('input', {
    type: 'text',
    name: 'title',
    className: 'input',
    required: true,
    value: app.currentVacancy ? app.currentVacancy.title : '',
    placeholder: 'e.g. Senior Software Engineer'
  });
  titleGroup.appendChild(titleInput);

  // Department
  const deptGroup = app.createElement('div', { className: 'form-group' });
  deptGroup.appendChild(app.createElement('label', {}, ['Department *']));
  const deptSelect = app.createElement('select', {
    name: 'departmentCode',
    className: 'input',
    required: true
  });
  const deptEmpty = app.createElement('option', { value: '' }, ['-- Select Department --']);
  deptSelect.appendChild(deptEmpty);
  app.departments.forEach(dept => {
    const option = app.createElement('option', {
      value: dept.code,
      selected: app.currentVacancy && app.currentVacancy.departmentCode === dept.code
    }, [dept.name]);
    deptSelect.appendChild(option);
  });
  deptGroup.appendChild(deptSelect);

  // Team
  const teamGroup = app.createElement('div', { className: 'form-group' });
  teamGroup.appendChild(app.createElement('label', {}, ['Team']));
  const teamSelect = app.createElement('select', {
    name: 'teamCode',
    className: 'input'
  });
  const teamEmpty = app.createElement('option', { value: '' }, ['-- Select Team --']);
  teamSelect.appendChild(teamEmpty);
  app.teams.forEach(team => {
    const option = app.createElement('option', {
      value: team.teamCode,
      selected: app.currentVacancy && app.currentVacancy.teamCode === team.teamCode
    }, [team.teamName]);
    teamSelect.appendChild(option);
  });
  teamGroup.appendChild(teamSelect);

  // Designation
  const desgGroup = app.createElement('div', { className: 'form-group' });
  desgGroup.appendChild(app.createElement('label', {}, ['Designation *']));
  const desgSelect = app.createElement('select', {
    name: 'designationCode',
    className: 'input',
    required: true
  });
  const desgEmpty = app.createElement('option', { value: '' }, ['-- Select Designation --']);
  desgSelect.appendChild(desgEmpty);
  app.designations.forEach(desg => {
    const option = app.createElement('option', {
      value: desg.code,
      selected: app.currentVacancy && app.currentVacancy.designationCode === desg.code
    }, [desg.name]);
    desgSelect.appendChild(option);
  });
  desgGroup.appendChild(desgSelect);

  // Workstation
  const workstationGroup = app.createElement('div', { className: 'form-group' });
  workstationGroup.appendChild(app.createElement('label', {}, ['Workstation']));
  const workstationSelect = app.createElement('select', {
    name: 'workstationId',
    className: 'input'
  });
  const workstationEmpty = app.createElement('option', { value: '' }, ['-- Select Workstation --']);
  workstationSelect.appendChild(workstationEmpty);
  app.workstations.forEach(ws => {
    const option = app.createElement('option', {
      value: ws._id,
      selected: app.currentVacancy && app.currentVacancy.workstationId === ws._id
    }, [ws.name || ws._id]);
    workstationSelect.appendChild(option);
  });
  workstationGroup.appendChild(workstationSelect);

  // Minimum Education Level
  const eduLevelGroup = app.createElement('div', { className: 'form-group' });
  eduLevelGroup.appendChild(app.createElement('label', {}, ['Minimum Education Level *']));
  const eduLevelSelect = app.createElement('select', {
    name: 'minimumEducationLevelCode',
    className: 'input',
    required: true
  });
  const eduLevelEmpty = app.createElement('option', { value: '' }, ['-- Select Level --']);
  eduLevelSelect.appendChild(eduLevelEmpty);
  app.educationLevels.forEach(level => {
    const option = app.createElement('option', {
      value: level.code,
      selected: app.currentVacancy && app.currentVacancy.minimumEducationLevelCode === level.code
    }, [level.name]);
    eduLevelSelect.appendChild(option);
  });
  eduLevelGroup.appendChild(eduLevelSelect);

  // Major Subjects (3 fields)
  const subject1Group = app.createElement('div', { className: 'form-group' });
  subject1Group.appendChild(app.createElement('label', {}, ['Major Subject 1 *']));
  const subject1Select = app.createElement('select', {
    name: 'majorSubjectOneCode',
    className: 'input',
    required: true
  });
  const subject1Empty = app.createElement('option', { value: '' }, ['-- Select Subject --']);
  subject1Select.appendChild(subject1Empty);
  app.subjects.forEach(subject => {
    const option = app.createElement('option', {
      value: subject.code,
      selected: app.currentVacancy && app.currentVacancy.majorSubjectOneCode === subject.code
    }, [subject.name]);
    subject1Select.appendChild(option);
  });
  subject1Group.appendChild(subject1Select);

  const subject2Group = app.createElement('div', { className: 'form-group' });
  subject2Group.appendChild(app.createElement('label', {}, ['Major Subject 2']));
  const subject2Select = app.createElement('select', {
    name: 'majorSubjectTwoCode',
    className: 'input'
  });
  const subject2Empty = app.createElement('option', { value: '' }, ['-- Select Subject --']);
  subject2Select.appendChild(subject2Empty);
  app.subjects.forEach(subject => {
    const option = app.createElement('option', {
      value: subject.code,
      selected: app.currentVacancy && app.currentVacancy.majorSubjectTwoCode === subject.code
    }, [subject.name]);
    subject2Select.appendChild(option);
  });
  subject2Group.appendChild(subject2Select);

  const subject3Group = app.createElement('div', { className: 'form-group' });
  subject3Group.appendChild(app.createElement('label', {}, ['Major Subject 3']));
  const subject3Select = app.createElement('select', {
    name: 'majorSubjectThreeCode',
    className: 'input'
  });
  const subject3Empty = app.createElement('option', { value: '' }, ['-- Select Subject --']);
  subject3Select.appendChild(subject3Empty);
  app.subjects.forEach(subject => {
    const option = app.createElement('option', {
      value: subject.code,
      selected: app.currentVacancy && app.currentVacancy.majorSubjectThreeCode === subject.code
    }, [subject.name]);
    subject3Select.appendChild(option);
  });
  subject3Group.appendChild(subject3Select);

  // Required Skills (3 fields)
  const skill1Group = app.createElement('div', { className: 'form-group' });
  skill1Group.appendChild(app.createElement('label', {}, ['Required Skill 1 *']));
  const skill1Select = app.createElement('select', {
    name: 'requiredSkillOneCode',
    className: 'input',
    required: true
  });
  const skill1Empty = app.createElement('option', { value: '' }, ['-- Select Skill --']);
  skill1Select.appendChild(skill1Empty);
  app.skills.forEach(skill => {
    const option = app.createElement('option', {
      value: skill.code,
      selected: app.currentVacancy && app.currentVacancy.requiredSkillOneCode === skill.code
    }, [skill.name]);
    skill1Select.appendChild(option);
  });
  skill1Group.appendChild(skill1Select);

  const skill2Group = app.createElement('div', { className: 'form-group' });
  skill2Group.appendChild(app.createElement('label', {}, ['Required Skill 2 *']));
  const skill2Select = app.createElement('select', {
    name: 'requiredSkillTwoCode',
    className: 'input',
    required: true
  });
  const skill2Empty = app.createElement('option', { value: '' }, ['-- Select Skill --']);
  skill2Select.appendChild(skill2Empty);
  app.skills.forEach(skill => {
    const option = app.createElement('option', {
      value: skill.code,
      selected: app.currentVacancy && app.currentVacancy.requiredSkillTwoCode === skill.code
    }, [skill.name]);
    skill2Select.appendChild(option);
  });
  skill2Group.appendChild(skill2Select);

  const skill3Group = app.createElement('div', { className: 'form-group' });
  skill3Group.appendChild(app.createElement('label', {}, ['Required Skill 3 *']));
  const skill3Select = app.createElement('select', {
    name: 'requiredSkillThreeCode',
    className: 'input',
    required: true
  });
  const skill3Empty = app.createElement('option', { value: '' }, ['-- Select Skill --']);
  skill3Select.appendChild(skill3Empty);
  app.skills.forEach(skill => {
    const option = app.createElement('option', {
      value: skill.code,
      selected: app.currentVacancy && app.currentVacancy.requiredSkillThreeCode === skill.code
    }, [skill.name]);
    skill3Select.appendChild(option);
  });
  skill3Group.appendChild(skill3Select);

  // Good to Have Skills (2 fields)
  const goodSkill1Group = app.createElement('div', { className: 'form-group' });
  goodSkill1Group.appendChild(app.createElement('label', {}, ['Good to Have Skill 1']));
  const goodSkill1Select = app.createElement('select', {
    name: 'goodToHaveSkillOneCode',
    className: 'input'
  });
  const goodSkill1Empty = app.createElement('option', { value: '' }, ['-- Select Skill --']);
  goodSkill1Select.appendChild(goodSkill1Empty);
  app.skills.forEach(skill => {
    const option = app.createElement('option', {
      value: skill.code,
      selected: app.currentVacancy && app.currentVacancy.goodToHaveSkillOneCode === skill.code
    }, [skill.name]);
    goodSkill1Select.appendChild(option);
  });
  goodSkill1Group.appendChild(goodSkill1Select);

  const goodSkill2Group = app.createElement('div', { className: 'form-group' });
  goodSkill2Group.appendChild(app.createElement('label', {}, ['Good to Have Skill 2']));
  const goodSkill2Select = app.createElement('select', {
    name: 'goodToHaveSkillTwoCode',
    className: 'input'
  });
  const goodSkill2Empty = app.createElement('option', { value: '' }, ['-- Select Skill --']);
  goodSkill2Select.appendChild(goodSkill2Empty);
  app.skills.forEach(skill => {
    const option = app.createElement('option', {
      value: skill.code,
      selected: app.currentVacancy && app.currentVacancy.goodToHaveSkillTwoCode === skill.code
    }, [skill.name]);
    goodSkill2Select.appendChild(option);
  });
  goodSkill2Group.appendChild(goodSkill2Select);

  // Work Experience
  const expGroup = app.createElement('div', { className: 'form-group' });
  expGroup.appendChild(app.createElement('label', {}, ['Work Experience (Years) *']));
  const expInput = app.createElement('input', {
    type: 'number',
    name: 'workExperienceYears',
    className: 'input',
    required: true,
    min: '0',
    value: app.currentVacancy ? app.currentVacancy.workExperienceYears : '0'
  });
  expGroup.appendChild(expInput);

  // Description
  const descGroup = app.createElement('div', { className: 'form-group' });
  descGroup.appendChild(app.createElement('label', {}, ['Job Description']));
  const descTextarea = app.createElement('textarea', {
    name: 'description',
    className: 'input',
    rows: '5',
    placeholder: 'Describe the position...'
  }, [app.currentVacancy ? (app.currentVacancy.description || '') : '']);
  descGroup.appendChild(descTextarea);

  // Status
  const statusGroup = app.createElement('div', { className: 'form-group' });
  statusGroup.appendChild(app.createElement('label', {}, ['Status']));
  const statusSelect = app.createElement('select', {
    name: 'status',
    className: 'input'
  });
  VACANCY_STATUS_OPTIONS.forEach(status => {
    const option = app.createElement('option', {
      value: status,
      selected: app.currentVacancy && app.currentVacancy.status === status
    }, [status.charAt(0).toUpperCase() + status.slice(1)]);
    statusSelect.appendChild(option);
  });
  statusGroup.appendChild(statusSelect);

  // Form actions
  const formActions = app.createElement('div', { className: 'form-actions' });
  const saveBtn = app.createElement('button', {
    className: 'btn btn-primary',
    type: 'submit'
  }, [isNew ? 'Create Vacancy' : 'Update Vacancy']);
  const cancelBtn = app.createElement('button', {
    className: 'btn btn-secondary',
    type: 'button',
    onclick: () => {
      app.currentView = 'org-vacancies';
      app.render();
    }
  }, ['Cancel']);
  formActions.appendChild(saveBtn);
  formActions.appendChild(cancelBtn);

  // Assemble form
  form.appendChild(titleGroup);
  form.appendChild(deptGroup);
  form.appendChild(teamGroup);
  form.appendChild(desgGroup);
  form.appendChild(workstationGroup);
  form.appendChild(eduLevelGroup);
  form.appendChild(subject1Group);
  form.appendChild(subject2Group);
  form.appendChild(subject3Group);
  form.appendChild(skill1Group);
  form.appendChild(skill2Group);
  form.appendChild(skill3Group);
  form.appendChild(goodSkill1Group);
  form.appendChild(goodSkill2Group);
  form.appendChild(expGroup);
  form.appendChild(descGroup);
  form.appendChild(statusGroup);
  form.appendChild(formActions);

  app.container.appendChild(header);
  app.container.appendChild(form);
}
