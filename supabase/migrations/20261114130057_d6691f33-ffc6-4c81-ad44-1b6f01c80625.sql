DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.care_services) THEN RAISE EXCEPTION 'Catalogue déjà configuré : ne pas remplacer implicitement'; END IF; END; $$;
INSERT INTO public.care_services(name,duration_minutes,is_active) VALUES
('Consultation',30,true),
('Premier bilan',60,true),
('Détartrage courant',30,true),
('Nettoyage approfondi',60,true),
('Obturation / soin de carie',60,true),
('Couronne — séance',60,true),
('Traitement de canal — séance',120,true);
DO $$ DECLARE row record; BEGIN
 FOR row IN SELECT * FROM (VALUES ('Consultation',30),('Premier bilan',60),('Détartrage courant',30),('Nettoyage approfondi',60),('Obturation / soin de carie',60),('Couronne — séance',60),('Traitement de canal — séance',120)) AS expected(name,minutes) LOOP
 IF (SELECT count(*) FROM public.care_services WHERE name=row.name AND duration_minutes=row.minutes AND is_active)<>1 THEN RAISE EXCEPTION 'TEST FAILED: service % must have % minutes',row.name,row.minutes; END IF;
 END LOOP;
END; $$;