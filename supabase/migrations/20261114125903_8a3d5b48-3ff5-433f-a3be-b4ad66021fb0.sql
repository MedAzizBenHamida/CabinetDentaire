DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.care_resources WHERE id='00000000-0000-4000-8000-000000000001' AND is_active) THEN RAISE EXCEPTION 'Ressource active requise'; END IF;
 IF EXISTS(SELECT 1 FROM public.opening_intervals WHERE resource_id='00000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Horaires déjà configurés : ne pas remplacer implicitement'; END IF;
END; $$;
INSERT INTO public.opening_intervals(resource_id,weekday,opens_at,closes_at) VALUES
('00000000-0000-4000-8000-000000000001',1,'08:00','13:00'),
('00000000-0000-4000-8000-000000000001',1,'15:00','17:00'),
('00000000-0000-4000-8000-000000000001',2,'08:00','13:00'),
('00000000-0000-4000-8000-000000000001',2,'15:00','17:00'),
('00000000-0000-4000-8000-000000000001',3,'08:00','13:00'),
('00000000-0000-4000-8000-000000000001',3,'15:00','17:00'),
('00000000-0000-4000-8000-000000000001',4,'08:00','13:00'),
('00000000-0000-4000-8000-000000000001',4,'15:00','17:00'),
('00000000-0000-4000-8000-000000000001',5,'08:00','13:00'),
('00000000-0000-4000-8000-000000000001',5,'15:00','17:00'),
('00000000-0000-4000-8000-000000000001',6,'08:00','13:00');
DO $$ DECLARE rid uuid:='00000000-0000-4000-8000-000000000001'; BEGIN
 IF (SELECT count(*) FROM public.opening_intervals WHERE resource_id=rid AND weekday BETWEEN 1 AND 5 AND ((opens_at=time '08:00' AND closes_at=time '13:00') OR (opens_at=time '15:00' AND closes_at=time '17:00')))<>10 THEN RAISE EXCEPTION 'TEST FAILED: weekday hours'; END IF;
 IF (SELECT count(*) FROM public.opening_intervals WHERE resource_id=rid AND weekday=6 AND opens_at=time '08:00' AND closes_at=time '13:00')<>1 THEN RAISE EXCEPTION 'TEST FAILED: Saturday hours'; END IF;
 IF EXISTS(SELECT 1 FROM public.opening_intervals WHERE resource_id=rid AND weekday=0) THEN RAISE EXCEPTION 'TEST FAILED: Sunday closure'; END IF;
 IF EXISTS(SELECT 1 FROM public.opening_intervals WHERE resource_id=rid AND weekday BETWEEN 1 AND 5 AND opens_at<time '15:00' AND closes_at>time '13:00') THEN RAISE EXCEPTION 'TEST FAILED: midday pause'; END IF;
END; $$;