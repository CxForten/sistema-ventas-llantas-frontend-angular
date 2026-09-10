export const Money = {
    toCents(value: string | number | null | undefined): number {
        if (value === null || value === undefined || value === '') return 0;

        const n = typeof value === 'string'
            ? parseFloat (value.replace(/[$\s]/g, '').replace(',', '.'))
            : value;

        return Math.round ((n || 0) * 100);
    },

    format(cents: number): string {
        return (cents / 100).toFixed(2);
    },

    display(cents: number): string {
        const sign = cents < 0 ? '-' : '';
        const abs = Math.abs(cents);
        return sign + '$' + (abs/100).toLocaleString('es-EC', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    },

    withMargin(costCents: number, marginPct: number): number {
        return Math.round(costCents * (1 + marginPct/100));
    }
}