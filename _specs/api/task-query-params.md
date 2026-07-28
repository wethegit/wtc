## Query Params

- Name

  `updatedBefore`

  Type

  string

  Description

  filter by updated before date

- Name

  `updatedAfter`

  Type

  string

  Description

  filter by updated after date

- Name

  `today`

  Type

  string

  Description

  filter by today

- Name

  `taskFilter`

  Type

  string

  Description

  filter by a taskFilter

  Allowed values
  - `all`
  - `anytime`
  - `completed`
  - `created`
  - `overdue`
  - `today`
  - `yesterday`
  - `started`
  - `tomorrow`
  - `thisweek`
  - `within7`
  - `within14`
  - `within30`
  - `within365`
  - `nodate`
  - `noduedate`
  - `nostartdate`
  - `newTaskDefaults`
  - `hasDate`

- Name

  `startDate`

  Type

  string

  Description

  filter on start date

- Name

  `searchTerm`

  Type

  string

  Description

  filter by search term

- Name

  `reportType`

  Type

  string

  Description

  define the type of the report

  Default

  `task`

  Allowed values
  - `plannedvsactual`
  - `task`
  - `tasktime`

- Name

  `reportFormat`

  Type

  string

  Description

  define the format of the report

  Default

  `pdf`

  Allowed values
  - `html`
  - `pdf`

- Name

  `projectType`

  Type

  string

  Description

  filter results by project type. Leave empty to include all types (e.g. `&projectType=`)

  Allowed values
  - `normal`
  - `tentative`

- Name

  `priority`

  Type

  string

  Description

  filter by task priority

- Name

  `orderMode`

  Type

  string

  Description

  order mode

  Default

  `asc`

  Allowed values
  - `asc`
  - `desc`

- Name

  `orderBy`

  Type

  string

  Description

  order by

  Default

  `duedate`

  Allowed values
  - `id`
  - `startdate`
  - `createdat`
  - `priority`
  - `project`
  - `flattenedtasklist`
  - `company`
  - `manual`
  - `active`
  - `completedat`
  - `duestartdate`
  - `alldates`
  - `tasklistname`
  - `tasklistdisplayorder`
  - `tasklistid`
  - `duedate`
  - `updatedat`
  - `taskname`
  - `createdby`
  - `completedby`
  - `assignedto`
  - `taskstatus`
  - `taskduedate`
  - `customfield`
  - `estimatedtime`
  - `boardcolumn`
  - `taskgroupid`
  - `taskgroupname`
  - `taskgroup`
  - `displayorder`
  - `projectmanual`
  - `stagedisplayorder`
  - `stage`
  - `parenttask`

- Name

  `notCompletedBefore`

  Type

  string

  Description

  filter by projects that have not been completed before the given date

- Name

  `endDate`

  Type

  string

  Description

  filter on end date

- Name

  `dueBefore`

  Type

  string

  Description

  filter before a due date

- Name

  `dueAfter`

  Type

  string

  Description

  filter after a due date

- Name

  `deletedAfter`

  Type

  string

  Description

  filter on deleted after date

- Name

  `createdFilter`

  Type

  string

  Description

  filter by created filter

  Allowed values
  - `anytime`
  - `today`
  - `yesterday`
  - `custom`

- Name

  `createdDateCode`

  Type

  string

  Description

  filter by created date code

- Name

  `createdBefore`

  Type

  string

  Description

  filter by created before date

- Name

  `createdAfter`

  Type

  string

  Description

  filter by created after date

- Name

  `completedBefore`

  Type

  string

  Description

  filter by completed before date

- Name

  `completedAfter`

  Type

  string

  Description

  filter by completed after date

- Name

  `updatedByUserId`

  Type

  integer

  Description

  filter by updated user id

- Name

  `parentTaskId`

  Type

  integer

  Description

  filter by parent task ids

- Name

  `pageSize`

  Type

  integer

  Description

  number of items in a page

  Default

  `50`

- Name

  `page`

  Type

  integer

  Description

  page number

  Default

  `1`

- Name

  `orderByCustomFieldId`

  Type

  integer

  Description

  order by custom field id when orderBy is equal to customfield

- Name

  `includeTaskId`

  Type

  integer

  Description

  include task id

- Name

  `filterId`

  Type

  integer

  Description

  provide a user saved filter ID

- Name

  `completedByUserId`

  Type

  integer

  Description

  filter by completed user id

- Name

  `useTaskDateRange`

  Type

  boolean

  Description

  use daterange logic from table when getting the tasks

  Default

  `false`

- Name

  `useStartDatesForTodaysTasks`

  Type

  boolean

  Description

  use start dates for todays tasks

- Name

  `useFormulaFields`

  Type

  boolean

  Description

  use formula fields

- Name

  `useAllProjects`

  Type

  boolean

  Description

  filter on all projects

- Name

  `sortActiveFirst`

  Type

  boolean

  Description

  sort active tasks first

  Default

  `false`

- Name

  `skipCounts`

  Type

  boolean

  Description

  SkipCounts allows you to skip doing counts on a list API endpoint for performance reasons.

- Name

  `showDeleted`

  Type

  boolean

  Description

  include deleted items

  Default

  `false`

- Name

  `showCompletedLists`

  Type

  boolean

  Description

  include tasks from completed lists

- Name

  `searchJobRoles`

  Type

  boolean

  Description

  include job roles in the search term

- Name

  `searchCompaniesTeams`

  Type

  boolean

  Description

  include companies and teams in the search term

- Name

  `searchAssignees`

  Type

  boolean

  Description

  include assignees in the search

- Name

  `onlyUntaggedTasks`

  Type

  boolean

  Description

  only untagged tasks

- Name

  `onlyUnplanned`

  Type

  boolean

  Description

  only return tasks that are unplanned. Not assigned, no due date or missing estimated time.

  Default

  `false`

- Name

  `onlyUnassignedTasks`

  Type

  boolean

  Description

  only include tasks that are unassigned

- Name

  `onlyTasksWithUnreadComments`

  Type

  boolean

  Description

  filter by only tasks with unread comments

- Name

  `onlyTasksWithTickets`

  Type

  boolean

  Description

  filter by only tasks with tickets

- Name

  `onlyTasksWithEstimatedTime`

  Type

  boolean

  Description

  only return tasks with estimated time

- Name

  `onlyStarredProjects`

  Type

  boolean

  Description

  filter by starred projects only

- Name

  `onlyAssignedTasks`

  Type

  boolean

  Description

  only include tasks that have a user assigned

- Name

  `onlyAssignedRoleTasks`

  Type

  boolean

  Description

  only include tasks that have a job role assigned

- Name

  `onlyAdminProjects`

  Type

  boolean

  Description

  only include tasks from projects where the user is strictly a project admin. site admins have visibility to all projects.

- Name

  `nestSubTasks`

  Type

  boolean

  Description

  nest sub tasks

- Name

  `matchAllTags`

  Type

  boolean

  Description

  match all tags

- Name

  `matchAllProjectTags`

  Type

  boolean

  Description

  match all project tags

- Name

  `matchAllExcludedTags`

  Type

  boolean

  Description

  match all exclude tags

- Name

  `isReportDownload`

  Type

  boolean

  Description

  generate a report export.

  Default

  `false`

- Name

  `includeUpdate`

  Type

  boolean

  Description

  include tasks latest update action

- Name

  `includeUntaggedTasks`

  Type

  boolean

  Description

  include untagged tasks

- Name

  `includeTomorrow`

  Type

  boolean

  Description

  filter by include tomorrow

- Name

  `includeToday`

  Type

  boolean

  Description

  filter by include today

- Name

  `includeTentativeProjects`

  Type

  boolean

  Description

  include tentative projects

- Name

  `includeTeamUserIds`

  Type

  boolean

  Description

  include members of the given teams

- Name

  `includeTasksWithoutDueDates`

  Type

  boolean

  Description

  include tasks without due dates

- Name

  `includeTasksFromDeletedLists`

  Type

  boolean

  Description

  include tasks from deleted lists

- Name

  `includeTasksCount`

  Type

  boolean

  Description

  include total count of tasks for given filter

  Default

  `false`

- Name

  `includeRelatedTasks`

  Type

  boolean

  Description

  include ids of active subtasks, dependencies, predecessors

- Name

  `includePrivateItems`

  Type

  boolean

  Description

  include private items

- Name

  `includeOverdueTasks`

  Type

  boolean

  Description

  include overdue tasks

- Name

  `includeOriginalDueDate`

  Type

  boolean

  Description

  include original due date of a task

- Name

  `includeJobRoleUserIds`

  Type

  boolean

  Description

  include members of the given job roles

- Name

  `includeCustomFields`

  Type

  boolean

  Description

  include custom fields

  Default

  `false`

- Name

  `includeCompletedTasks`

  Type

  boolean

  Description

  include completed tasks

- Name

  `includeCompletedPredecessors`

  Type

  boolean

  Description

  include ids of completed predecessors. It must be provided with includeRelatedTasks flag or with the predecessors sideload.

- Name

  `includeCompanyUserIds`

  Type

  boolean

  Description

  include members of the given companies

- Name

  `includeCommentStats`

  Type

  boolean

  Description

  include number of unread and read comments for each task

  Default

  `false`

- Name

  `includeBlocked`

  Type

  boolean

  Description

  filter by include blocked

- Name

  `includeAttachmentCommentStats`

  Type

  boolean

  Description

  include number of unread and read comments for each file attachment

  Default

  `false`

- Name

  `includeAssigneeTeams`

  Type

  boolean

  Description

  include teams related to the responsible user ids

- Name

  `includeAssigneeJobRoles`

  Type

  boolean

  Description

  include job roles related to the responsible user ids

- Name

  `includeAssigneeCompanies`

  Type

  boolean

  Description

  include companies related to the responsible user ids

- Name

  `includeArchivedProjects`

  Type

  boolean

  Description

  include archived projects

- Name

  `includeAllComments`

  Type

  boolean

  Description

  include all comments

- Name

  `includeAccumulatedTimeTotals`

  Type

  boolean

  Description

  Populate accumulatedLoggedMinutes / accumulatedBillableLoggedMinutes / accumulatedBilledloggedMinutes on the timeTotals sideload. Equivalent to adding "accumulatedTimeTotals" to the include list. Costs an extra recursive query; leave unset when the subtask rollup is not needed.

- Name

  `groupByTasklist`

  Type

  boolean

  Description

  group by tasklist

- Name

  `groupByTaskgroup`

  Type

  boolean

  Description

  group by taskgroup

- Name

  `getSubTasks`

  Type

  boolean

  Description

  get sub tasks

- Name

  `getFiles`

  Type

  boolean

  Description

  get files

- Name

  `fallbackToMilestoneDueDate`

  Type

  boolean

  Description

  set due date as milestone due date if due date is null and there's a related milestone

- Name

  `extractTemplateRoleName`

  Type

  boolean

  Description

  For tasks created in a project template it's possible to assign a role instead of people, companies or teams. This role is then stored with the task name as a prefix. When this flag is enabled it will extract the role name and return it inside a special field.

- Name

  `excludeAssigneeNotOnProjectTeams`

  Type

  boolean

  Description

  exclude assignee not on project teams

- Name

  `excludeAssignedToMe`

  Type

  boolean

  Description

  exclude tasks that are assigned to the logged-in user (e.g. to show only tasks the user created and delegated to others)

- Name

  `deletedOnly`

  Type

  boolean

  Description

  only deleted tasks

  Default

  `false`

- Name

  `completedOnly`

  Type

  boolean

  Description

  only completed tasks

  Default

  `false`

- Name

  `checkForTimeblocks`

  Type

  boolean

  Description

  check if task has timeblocks for the current user

- Name

  `checkForReminders`

  Type

  boolean

  Description

  check if task has reminders

- Name

  `calculateTasklistDates`

  Type

  boolean

  Description

  calculate task list start and due dates from earliest and latest tasks

- Name

  `allowAssigneesOutsideProject`

  Type

  boolean

  Description

  when filtering by assigned or unassagned tasks, include assignees that are not in the project.

  Default

  `true`

- Name

  `tasksSelectedColumns`

  Type

  array\[string\]

  Description

  customise the report by selecting columns to be displayed for tasks report

  Format

  Comma separated values

- Name

  `tasklistIds`

  Type

  array\[integer\]

  Description

  filter by tasklist ids

  Format

  Comma separated values

- Name

  `taskgroupIds`

  Type

  array\[integer\]

  Description

  filter by taskgroup ids

  Format

  Comma separated values

- Name

  `taskIncludedSet`

  Type

  array\[string\]

  Description

  filter by task included set

  Format

  Comma separated values

  Allowed values
  - `overdue`
  - `nodate`
  - `nostartdate`
  - `noduedate`
  - `nostartwithfutureduedate`
  - `taskListNames`
  - `projectNames`

- Name

  `tags`

  Type

  array\[string\]

  Description

  filter by tag values

  Format

  Comma separated values

- Name

  `tagIds`

  Type

  array\[integer\]

  Description

  filter by tag ids

  Format

  Comma separated values

- Name

  `status`

  Type

  array\[string\]

  Description

  filter by list of task status

  Format

  Comma separated values

  Allowed values
  - `upcoming`
  - `late`
  - `all`

- Name

  `sort`

  Type

  array\[string\]

  Description

  Multi level sort for tasks, first value is the primary sort

  for descending order prepend "-"" to the sort value e.g. sort=-project

  Format

  Comma separated values

- Name

  `skipCRMDealIds`

  Type

  array\[integer\]

  Description

  skip crm deal ids

  Format

  Comma separated values

- Name

  `selectedColumns`

  Type

  array\[string\]

  Description

  customise the report by selecting columns to be displayed for planned vs actual.

  Format

  Comma separated values

- Name

  `responsiblePartyIds`

  Type

  array\[integer\]

  Description

  filter by responsible party ids

  Format

  Comma separated values

- Name

  `projectTagIds`

  Type

  array\[integer\]

  Description

  filter by project tag ids

  Format

  Comma separated values

- Name

  `projectStatuses`

  Type

  array\[string\]

  Description

  filter by project status

  Format

  Comma separated values

  Allowed values
  - `active`
  - `current`
  - `late`
  - `upcoming`
  - `completed`
  - `deleted`

- Name

  `projectOwnerIds`

  Type

  array\[integer\]

  Description

  filter by project owner ids

  Format

  Comma separated values

- Name

  `projectIds`

  Type

  array\[integer\]

  Description

  filter by project ids

  Format

  Comma separated values

- Name

  `projectHealths`

  Type

  array\[integer\]

  Description

  filter by project healths

  0: not set 1: bad 2: ok 3: good

  Format

  Comma separated values

  Allowed values
  - `0`
  - `1`
  - `2`
  - `3`

- Name

  `projectFeaturesEnabled`

  Type

  array\[string\]

  Description

  filter by projects that have features enabled

  Format

  Comma separated values

  Allowed values
  - `list`
  - `board`
  - `gantt`
  - `table`
  - `dashboard`
  - `milestones`
  - `messages`
  - `files`
  - `time`
  - `notebooks`
  - `risks`
  - `links`
  - `billing`
  - `comments`
  - `people`
  - `settings`

- Name

  `projectCompanyIds`

  Type

  array\[integer\]

  Description

  filter by company ids

  Format

  Comma separated values

- Name

  `projectCategoryIds`

  Type

  array\[integer\]

  Description

  filter by project category ids

  Format

  Comma separated values

- Name

  `portfolioBoardIds`

  Type

  array\[integer\]

  Description

  filter by portfolio board ids

  Format

  Comma separated values

- Name

  `includeCustomFieldIds`

  Type

  array\[integer\]

  Description

  include specific custom fields

  Format

  Comma separated values

- Name

  `include`

  Type

  array\[string\]

  Description

  include (permissions deprecated, use projects.permissions)

  Format

  Comma separated values

  Allowed values
  - `projects`
  - `projects.companies`
  - `projects.categories`
  - `projects.permissions`
  - `projects.integrations`
  - `tasklists`
  - `parentTasks`
  - `companies`
  - `teams`
  - `users`
  - `milestones`
  - `comments`
  - `comments.users`
  - `tags`
  - `cards`
  - `cards.columns`
  - `timeTotals`
  - `accumulatedTimeTotals`
  - `taskSequences`
  - `commentFollowers`
  - `changeFollowers`
  - `completeFollowers`
  - `lockdowns`
  - `lockdowns.users`
  - `lockdowns.companies`
  - `lockdowns.teams`
  - `lockdowns.users.companies`
  - `lockdowns.companies.users`
  - `lockdowns.teams.users`
  - `attachments`
  - `attachments.users`
  - `subtaskStats`
  - `timers`
  - `predecessors`
  - `permissions`
  - `jobRoles`

- Name

  `ids`

  Type

  array\[integer\]

  Description

  filter by task ids

  Format

  Comma separated values

- Name

  `followedByUserIds`

  Type

  array\[integer\]

  Description

  filter by followed by user ids

  Format

  Comma separated values

- Name

  `fields[workflows]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `id`
  - `name`
  - `statusId`

- Name

  `fields[users]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `id`
  - `firstName`
  - `lastName`
  - `title`
  - `email`
  - `companyId`
  - `company`
  - `isAdmin`
  - `isClientUser`
  - `isServiceAccount`
  - `type`
  - `deleted`
  - `avatarUrl`
  - `lengthOfDay`
  - `workingHoursId`
  - `workingHour`
  - `userRate`
  - `userCost`
  - `canAddProjects`

- Name

  `fields[timers]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `id`
  - `userId`
  - `taskId`
  - `projectId`
  - `description`
  - `running`
  - `billable`
  - `deleted`
  - `dateCreated`
  - `dateDeleted`
  - `duration`
  - `lastStartedAt`
  - `serverTime`
  - `intervals`

- Name

  `fields[teams]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `id`
  - `name`
  - `teamLogo`
  - `teamLogoIcon`
  - `teamLogoColor`

- Name

  `fields[tasks]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `id`
  - `name`
  - `dateUpdated`
  - `parentTaskId`
  - `isPrivate`
  - `status`
  - `tasklistId`
  - `startDate`
  - `dueDate`

- Name

  `fields[tasklists]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `id`
  - `name`
  - `projectId`
  - `milestoneId`

- Name

  `fields[taskgroups]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `id`
  - `name`
  - `description`
  - `displayOrder`
  - `projectId`
  - `status`

- Name

  `fields[taskSequences]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `id`
  - `installationId`
  - `frequency`
  - `selectedWeekDays`
  - `endDate`
  - `monthlyRepeatType`
  - `duration`
  - `rrule`

- Name

  `fields[tags]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `id`
  - `name`
  - `color`
  - `count`

- Name

  `fields[stages]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `id`
  - `name`
  - `stage`

- Name

  `fields[projects]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `id`
  - `name`
  - `type`
  - `status`
  - `company`
  - `companyId`
  - `categoryId`
  - `startPage`
  - `logoIcon`
  - `logoColor`
  - `updatedAt`
  - `isStarred`
  - `allowNotifyAnyone`
  - `notifyTaskAssignee`
  - `isBillable`
  - `timelogRequiresTask`

- Name

  `fields[projectIntegrations]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `userId`
  - `projectId`
  - `canAccessBox`
  - `canAccessDropbox`
  - `canAccessGoogleDocs`
  - `canAccessOneDrive`
  - `canAccessOneDriveBusiness`
  - `canAccessSharePoint`

- Name

  `fields[milestones]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `id`
  - `name`
  - `description`
  - `deadline`
  - `completed`
  - `projectId`
  - `createdOn`
  - `lastChangedOn`
  - `creatorUserId`
  - `reminder`
  - `private`
  - `lockdownId`
  - `status`
  - `completedOn`
  - `completerId`
  - `percentageComplete`

- Name

  `fields[lockdowns]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `id`
  - `userID`
  - `updatedAt`
  - `itemType`
  - `itemID`
  - `grantAccessTo`

- Name

  `fields[jobroles]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `id`
  - `name`

- Name

  `fields[groups]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `late`
  - `today`
  - `tomorrow`
  - `later-this-week`
  - `next-week`
  - `later`
  - `no-due-date`

- Name

  `fields[files]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `isPrivate`
  - `latestFileVersionNo`
  - `versionId`
  - `status`
  - `description`
  - `lockdownId`
  - `tagIds`
  - `changeFollowers`
  - `commentFollowers`
  - `originalName`
  - `displayName`
  - `isLocked`
  - `lockedByUserId`
  - `lockedDate`
  - `size`
  - `uploadedDate`
  - `uploadedByUserID`
  - `updatedAt`
  - `deletedAt`
  - `deletedBy`
  - `fileSource`
  - `projectId`
  - `numLikes`
  - `reactions`
  - `versions`
  - `downloadURL`
  - `previewURL`
  - `thumbURL`
  - `relatedItems`
  - `commentsCount`
  - `commentsCountRead`
  - `categoryId`

- Name

  `fields[customfields]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `id`
  - `projectId`
  - `entity`
  - `name`
  - `description`
  - `type`
  - `options`
  - `visibilities`
  - `isPrivate`
  - `required`
  - `createdAt`
  - `createdByUserId`
  - `updatedAt`
  - `updatedByUserId`
  - `deleted`
  - `deletedAt`
  - `deletedByUserId`

- Name

  `fields[customfieldTasks]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `id`
  - `customfieldId`
  - `value`
  - `createdAt`
  - `createdBy`

- Name

  `fields[companies]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `id`
  - `name`
  - `logoUploadedToServer`
  - `logoImage`

- Name

  `fields[comments]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `id`
  - `objectType`
  - `objectId`
  - `title`

- Name

  `fields[ProjectPermissions]`

  Type

  array\[string\]

  Description

  Format

  Comma separated values

  Allowed values
  - `viewMessagesAndFiles`
  - `viewTasksAndMilestones`
  - `viewTime`
  - `viewNotebooks`
  - `viewRiskRegister`
  - `viewEstimatedTime`
  - `viewInvoices`
  - `addTasks`
  - `addRisks`
  - `manageCustomFields`
  - `addExpenses`
  - `editAllTasks`
  - `addMilestones`
  - `addTaskLists`
  - `addMessages`
  - `addFiles`
  - `addTime`
  - `addNotebooks`
  - `viewLinks`
  - `addLinks`
  - `canViewForms`
  - `addForms`
  - `viewAllTimeLogs`
  - `setPrivacy`
  - `projectAdministrator`
  - `viewProjectUpdate`
  - `addProjectUpdate`
  - `canViewProjectMembers`
  - `canViewProjectBudget`
  - `canManageProjectBudget`
  - `canViewRates`
  - `canManageRates`
  - `canViewSchedule`
  - `canManageSchedule`
  - `receiveEmailNotifications`
  - `isObserving`
  - `isArchived`
  - `active`
  - `canAccess`
  - `inOwnerCompany`
  - `canManagePeople`
  - `canViewProjectTemplates`
  - `canManageProjectTemplates`

- Name

  `expandedIds`

  Type

  array\[integer\]

  Description

  the ids of the expanded tasks

  Format

  Comma separated values

- Name

  `excludeTagIds`

  Type

  array\[integer\]

  Description

  filter by excluded tag ids

  Format

  Comma separated values

- Name

  `crmDealIds`

  Type

  array\[integer\]

  Description

  filter by crm deal ids

  Format

  Comma separated values

- Name

  `createdByUserIds`

  Type

  array\[integer\]

  Description

  filter by creator user ids

  Format

  Comma separated values

- Name

  `assigneeTeamIds`

  Type

  array\[integer\]

  Description

  filter by assignee team ids

  Format

  Comma separated values

- Name

  `assigneeJobRoleIds`

  Type

  array\[integer\]

  Description

  filter by assignee jobRole ids

  Format

  Comma separated values

- Name

  `assigneeCompanyIds`

  Type

  array\[integer\]

  Description

  filter by assignee company ids

  Format

  Comma separated values

- Name

  `CustomFields`

  Type

  array\[string\]

  Description

  filter by custom fields

  Format

  Comma separated values
