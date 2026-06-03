'use client';

import { useEffect } from 'react';
import { ensureCorsOriginRegistered } from '../utils/corsBootstrap';

/** Registers window.location.origin with ERP CORS allowlist on every site load. */
export default function CorsBootstrap() {
    useEffect(() => {
        void ensureCorsOriginRegistered();
    }, []);

    return null;
}
