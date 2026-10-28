import {sqliteTable,integer,text} from 'drizzle-orm/sqlite-core';
export const store=sqliteTable('store',{id:integer('id').primaryKey(),data:text('data').notNull(),version:integer('version').notNull().default(0)});
