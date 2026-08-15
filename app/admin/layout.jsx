import AdminLayout from "@/components/admin/AdminLayout";

export const metadata = {
    title: "Ruvumera Market - Admin",
    description: "Ruvumera Market - Admin",
};

export default function RootAdminLayout({ children }) {

    return (
        <>
            <AdminLayout>
                {children}
            </AdminLayout>
        </>
    );
}
