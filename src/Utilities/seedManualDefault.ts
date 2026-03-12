import {
    calendarDb,
    MANUAL_WORKSPACE_ID,
    getProjectPreferenceKey
} from "./calendarDb";
import {PROJECT_COLORS} from "./manualData";

/**
 * If there are no manual companies, create "Default Company" with two projects:
 * "Billable Work" (billable) and "Non-billable work" (non-billable).
 * Idempotent: only runs when manualCompanies count is 0.
 */
export async function ensureDefaultManualWorkspace(): Promise<void> {
    const count = await calendarDb.manualCompanies.count();
    if (count > 0) return;

    const now = Date.now();
    const companyId = await calendarDb.manualCompanies.add({
        name: "Default Company",
        updatedAt: now
    });

    const billableProjectId = await calendarDb.manualProjects.add({
        companyId,
        name: "Billable Work",
        color: PROJECT_COLORS[0],
        updatedAt: now
    });
    const nonBillableProjectId = await calendarDb.manualProjects.add({
        companyId,
        name: "Non-billable work",
        color: PROJECT_COLORS[1],
        updatedAt: now
    });

    await calendarDb.projectPreferences.put({
        key: getProjectPreferenceKey(MANUAL_WORKSPACE_ID, billableProjectId),
        workspaceId: MANUAL_WORKSPACE_ID,
        projectId: billableProjectId,
        billable: true,
        updatedAt: now
    });
    await calendarDb.projectPreferences.put({
        key: getProjectPreferenceKey(MANUAL_WORKSPACE_ID, nonBillableProjectId),
        workspaceId: MANUAL_WORKSPACE_ID,
        projectId: nonBillableProjectId,
        billable: false,
        updatedAt: now
    });
}
