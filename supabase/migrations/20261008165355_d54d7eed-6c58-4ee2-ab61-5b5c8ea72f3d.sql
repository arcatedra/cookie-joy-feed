DO $migration$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.grant_captured_referral(text,uuid,text,text)'::regprocedure) INTO definition;
 definition:=replace(definition,'''fingerprint:''||v_fp.kind||'':''||v_fp.val','''fingerprint:''||p_environment||'':''||v_fp.kind||'':''||v_fp.val');
 definition:=replace(definition,'WHERE kind=v_fp.kind AND value_norm=v_fp.val AND user_id<>o.cliente_id','WHERE kind=v_fp.kind AND value_norm=p_environment||'':''||v_fp.val AND user_id<>o.cliente_id');
 definition:=replace(definition,'VALUES(o.cliente_id,v_fp.kind,v_fp.val)','VALUES(o.cliente_id,v_fp.kind,p_environment||'':''||v_fp.val)');
 EXECUTE definition;
END $migration$;