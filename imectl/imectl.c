/*
 * imectl - get/set the Windows IME *conversion mode* of the foreground window.
 *
 * Why this exists:
 *   The Korean Microsoft IME is a single input source (HKL 0x0412 / "1042").
 *   The Hangul <-> English toggle is the IME *conversion mode*, not the
 *   keyboard layout. `im-select` only reads/sets the layout (HKL), so it
 *   cannot tell Hangul from English inside 1042 nor switch between them.
 *   This tool drives the conversion mode directly via WM_IME_CONTROL.
 *
 * Usage:
 *   imectl          print the current conversion mode (e.g. 1 = Hangul, 0 = English)
 *   imectl <n>      set the conversion mode to <n>
 *
 * For the Korean IME: 1 = Hangul (IME_CMODE_NATIVE), 0 = English (alphanumeric).
 *
 * Note: On Windows 10/11 this requires the "Use previous version of Microsoft
 * IME" (Legacy IME) compatibility option to be enabled, otherwise the new
 * TSF-based IME ignores WM_IME_CONTROL.
 */

#include <windows.h>
#include <imm.h>
#include <stdio.h>
#include <stdlib.h>

#ifndef IMC_GETCONVERSIONMODE
#define IMC_GETCONVERSIONMODE 0x0001
#endif
#ifndef IMC_SETCONVERSIONMODE
#define IMC_SETCONVERSIONMODE 0x0002
#endif

int main(int argc, char **argv) {
	HWND fg = GetForegroundWindow();
	if (fg == NULL) {
		return 1;
	}

	HWND ime = ImmGetDefaultIMEWnd(fg);
	if (ime == NULL) {
		return 1;
	}

	if (argc < 2) {
		/* GET: print current conversion mode so it can be restored later */
		LRESULT mode = SendMessageW(ime, WM_IME_CONTROL,
					    (WPARAM)IMC_GETCONVERSIONMODE, 0);
		printf("%ld\n", (long)mode);
		return 0;
	}

	/* SET: apply the requested conversion mode */
	long mode = strtol(argv[1], NULL, 10);
	SendMessageW(ime, WM_IME_CONTROL,
		     (WPARAM)IMC_SETCONVERSIONMODE, (LPARAM)mode);
	return 0;
}
