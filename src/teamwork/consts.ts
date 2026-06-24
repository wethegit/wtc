/** WTC is built for We The Collective's Teamwork instance, so the site is fixed instead of becoming user/project config. */
export const TEAMWORK_SITE_NAME = "wethecollective";
/** Human-facing Teamwork site URL. */
export const TEAMWORK_BASE_URL = `https://${TEAMWORK_SITE_NAME}.teamwork.com`;
/** Human-facing Teamwork timesheet URL. */
export const TEAMWORK_TIMESHEET_URL = `${TEAMWORK_BASE_URL}/app/time`;
/** Base URL for the Teamwork v3 API. */
export const TEAMWORK_API_BASE_URL = `${TEAMWORK_BASE_URL}/projects/api/v3`;
