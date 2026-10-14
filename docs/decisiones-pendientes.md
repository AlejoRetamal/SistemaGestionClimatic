# Decisiones y pendientes

## Confirmado e implementado

- Continuar el proyecto existente con Angular, Express y MySQL local `datos_climatic`, autorizado por el usuario. No acceder a una base remota de Jorge.
- PIN único, sesiones y matriz de permisos conservados. Dirección, Mantenimiento y Producción acceden a las acciones de mantenimiento existentes, sin agregar diferencias por acción.
- Máquinas con baja lógica y órdenes con cierre; historial sin eliminación ni edición libre.
- Repuesto asociado a una máquina mediante `repuestos.maquina_id`; proveedores múltiples mediante la tabla intermedia existente.
- Inventario rojo hasta el mínimo, amarillo hasta mínimo × 1,25, verde por encima. Cantidades con hasta dos decimales, conforme al esquema.
- Registro normal con máquina derivada de la tarea, operario de sesión y origen Mantenimiento. Orden opcional de la misma máquina.
- Registro y consumos transaccionales; triggers existentes actualizan stock y horómetro una sola vez.
- Reducción de horómetro con confirmación explícita y comprobación de la lectura vigente.
- Planes preventivos y predictivos separados; margen próximo configurable como porcentaje de frecuencia (10 % por defecto).
- Foto de repuesto como texto/URL, sin infraestructura de subidas.

## Pendientes de modelo o negocio

- **Ejecución extraordinaria:** la definición solo tiene nombre y descripción; falta relación de ejecución con esa definición y una máquina. La UI informa la limitación y no guarda ejecuciones ficticias. Se requiere acordar el modelo antes de proponer SQL.
- **Correcciones históricas:** auditoría de cambios, efecto sobre lecturas posteriores, planes y existencias. No se exponen PUT ni DELETE de registros.
- **Primer servicio y correcciones de lectura:** la vista existente usa el máximo histórico de horómetro y, sin registros, el horómetro actual como base. No equivale a la última lectura cronológica; no se alteró esta regla.
- Permisos por acción más específicos, si se necesitan posteriormente.
- Política de reactivación de máquinas; actualmente solo se ofrece la baja.
- Política de eliminación de repuestos con inventario asociado: la FK actual bloquea el borrado incluso con stock cero. Se informa el conflicto sin borrar inventario automáticamente.
- Política de PIN y almacenamiento definitivo: el modo local conserva los PIN existentes y sesiones en memoria.
- Flujo de asignación técnica de órdenes, Comercial, Producción y Administración fuera de mantenimiento.
- Instalación productiva, almacenamiento de sesiones persistente, copias de seguridad y eventual migración PostgreSQL. La propuesta anterior no describe el esquema MySQL activo.

No se cambiaron tablas, claves foráneas, vistas ni triggers durante esta ampliación. Las pruebas locales usan transacciones revertidas; los contadores autoincrementales pueden avanzar.
