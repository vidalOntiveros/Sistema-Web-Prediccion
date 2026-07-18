import { z } from 'zod';

// `extraData` va en el schema (no solo como passthrough) para que el resolver de
// zod no lo descarte del objeto que llega a onSubmit — su validación de tipo/
// obligatoriedad real la hace el servidor (validateExtraData) y se mapea de
// vuelta al formulario vía el 422 (ver docs/08-diseno-frontend.md §5).
export const studentFormSchema = z.object({
  controlNumber: z.string().min(1, 'El número de control es obligatorio.'),
  fullName: z.string().min(1, 'El nombre es obligatorio.'),
  career: z.string().min(1, 'La carrera es obligatoria.'),
  semester: z.coerce.number().int().min(1, 'Debe ser un entero entre 1 y 20.').max(20),
  extraData: z.record(z.string(), z.unknown()),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;
