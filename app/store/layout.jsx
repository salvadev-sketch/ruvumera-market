import StoreLayout from "@/components/store/StoreLayout";

export const metadata = {
    title: "Ruvumera Market - Store Dashboard",
    description: "Ruvumera Market - Store Dashboard",
};

export default function RootAdminLayout({ children }) {

    return (
        <>
            <StoreLayout>
                {children}
            </StoreLayout>
        </>
    );
}
