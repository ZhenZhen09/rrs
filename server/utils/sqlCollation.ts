export const APP_SQL_COLLATION = 'utf8mb4_unicode_ci';

export function collatedJsonEquals(jsonExpression: string, columnExpression: string) {
  return `CONVERT(${jsonExpression} USING utf8mb4) COLLATE ${APP_SQL_COLLATION} = ${columnExpression} COLLATE ${APP_SQL_COLLATION}`;
}
