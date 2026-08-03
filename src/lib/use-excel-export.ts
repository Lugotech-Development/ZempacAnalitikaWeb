'use client';

import { useCallback, useState } from 'react';
import { AccessBlockedError, UnauthorizedError, apiExcelExport, classifyError, type ExcelExportParams, type ExcelReportKey } from './api';
import { emitToast } from './toast-events';

/**
 * Requests a backend-generated Excel file and downloads it, exposing a `busy`
 * flag for the export button's spinner. On failure it shows an error toast so
 * the user knows the download didn't work (any status — 404, 5xx, network…).
 * Session-expired and access-blocked errors already raise their own global
 * modals, so those are left to them. Import from report pages and wire to
 * `ExcelExportButton`.
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
        // Session-expired / access-blocked already raise their global modals.
        if (e instanceof UnauthorizedError || e instanceof AccessBlockedError) return;
        const { variant, message } = classifyError(e);
        emitToast(
          'error',
          variant === 'network'
            ? 'No se pudo descargar el archivo: revisa tu conexión e inténtalo de nuevo.'
            : message || 'No se pudo generar el Excel. Inténtalo de nuevo.'
        );
      } finally {
        setBusy(false);
      }
    },
    [busy]
  );

  return { run, busy };
}
