import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast-provider";
import { employeeApi } from "@/services/employee-api";
import type {
  EmployeeFilters,
  EmployeeFormData,
  EmployeeUpdateData,
} from "@/types/employee";

// ============================================================================
// Employees Hooks
// ============================================================================

export function useEmployees(filters?: EmployeeFilters) {
  return useQuery({
    queryKey: ["employees", filters],
    queryFn: async () => {
      const response = await employeeApi.list(filters);
      return response.data;
    },
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ["employees", id],
    queryFn: async () => {
      const response = await employeeApi.get(id);
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function useNextEmployeeCode(enabled: boolean) {
  return useQuery({
    queryKey: ["employees", "next-code"],
    queryFn: async () => {
      const response = await employeeApi.nextCode();
      return response.data;
    },
    enabled,
    staleTime: 0,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (data: EmployeeFormData) => employeeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      showSuccess(
        "El empleado ha sido creado. Se le ha enviado un enlace para configurar su contraseña.",
        "Empleado creado",
      );
    },
    onError: (error: any) => {
      showError(
        error.response?.data?.message || "No se pudo crear el empleado.",
        "Error",
      );
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EmployeeUpdateData }) =>
      employeeApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees", variables.id] });
      showSuccess(
        "El empleado ha sido actualizado exitosamente.",
        "Empleado actualizado",
      );
    },
    onError: (error: any) => {
      showError(
        error.response?.data?.message || "No se pudo actualizar el empleado.",
        "Error",
      );
    },
  });
}

export function useToggleEmployeeActive() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (id: string) => employeeApi.toggleActive(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees", id] });
      showSuccess(
        "El estado del empleado ha sido actualizado.",
        "Estado actualizado",
      );
    },
    onError: (error: any) => {
      showError(
        error.response?.data?.message || "No se pudo actualizar el estado.",
        "Error",
      );
    },
  });
}
