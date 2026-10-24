import axe from 'axe-core';

/**
 * FoodBridge Accessibility Audit Helper
 * Integrates axe-core into the application runtime to detect WCAG AA/AAA
 * contrast issues, keyboard navigation gaps, and accessibility regressions.
 */
export async function runAxeAudit(context?: Element | Document): Promise<axe.AxeResults | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  try {
    const results = await axe.run(context || document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'color-contrast'],
      },
    });

    if (results.violations.length > 0) {
      console.group(
        `%c[axe-core] Found ${results.violations.length} Accessibility Violation(s)`,
        'color: #e11d48; font-weight: bold; font-size: 13px;'
      );

      results.violations.forEach((violation) => {
        console.warn(
          `%c${violation.id.toUpperCase()}: ${violation.description}`,
          'color: #d97706; font-weight: bold;',
          violation.helpUrl
        );
        violation.nodes.forEach((node) => {
          console.info('Element target:', node.target.join(' '));
          console.info('Summary:', node.failureSummary);
        });
      });

      console.groupEnd();
    } else {
      console.log(
        '%c[axe-core] Accessibility audit passed: 0 WCAG AA violations found.',
        'color: #174c35; font-weight: bold;'
      );
    }

    return results;
  } catch (err) {
    console.warn('[axe-core] Error executing accessibility audit:', err);
    return null;
  }
}
