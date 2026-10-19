import {expect,it} from 'vitest';
import {sessionResponseStatus} from '../../src/lib/auth/session-status';
it('uses a successful response for an optional anonymous navigation check',()=>{expect(sessionResponseStatus('anonymous',true)).toBe(200);expect(sessionResponseStatus('anonymous',false)).toBe(401);});
it('keeps an unavailable optional session distinct from an anonymous session',()=>{expect(sessionResponseStatus('unavailable',true)).toBe(200);expect(sessionResponseStatus('unavailable',false)).toBe(503);});
