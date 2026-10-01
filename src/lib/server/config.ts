import 'server-only';
import { parseServerConfig } from '../config/schema';
export function getServerConfig() { return parseServerConfig(process.env); }
