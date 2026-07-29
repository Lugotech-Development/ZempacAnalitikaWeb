'use client';

import { useCallback, useState } from 'react';
import { AccessBlockedError, UnauthorizedError, apiExcelExport, type ExcelExportParams, type ExcelReportKey } from './api';

/**
 * Requests a backend-generated Excel file and downloads it, exposing a `busy`
 * flag for the export button's spinner. Session-expired and access-blocked
 * errors already raise their global modals, so we don't surface them again;
 * other failures are tracked in the analytics layer and simply re-enable the
 * button. Import from report pages and wire to `ExcelExportButton`.
 */
export function useExcelExport() {
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (reportKey: ExcelReportKey, params?: ExcelExportParams) => {
      if (busy) return;
      setBusy(true);
      try {
        await apiExcelExport(reportKey, params);
      } catch (e) {
        // UnauthorizedError → session-expired modal; AccessBlockedError → block
        // modal. Both are already surfaced globally; nothing to do here.
        if (!(e instanceof UnauthorizedError) && !(e instanceof AccessBlockedError)) {
          // Other errors (network / 4xx / 5xx) are recorded by trackApiError.
        }
      } finally {
        setBusy(false);
      }
    },
    [busy]
  );

  return { run, busy };
}
