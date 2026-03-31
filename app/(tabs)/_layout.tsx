// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { View } from 'react-native'

const TabsLayout = () => {
    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: 'green',
            tabBarStyle: { backgroundColor: '#f3f3f3ff' },
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    headerTitle: "Overview",
                    title: "Overview",
                    tabBarIcon: ({ color }) => <Ionicons name="cash-outline" size={28} color={color} />,
                }}
            />
            <Tabs.Screen
                name="wallet/index"
                options={{
                    headerTitle: "Wallet",
                    title: "Wallet",
                    tabBarIcon: ({ color }) => <Ionicons name="wallet-outline" size={28} color={color} />
                }}
            />
            <Tabs.Screen
                name="new_transaction/index"
                options={{
                    headerTitle: "New Transaction",
                    title: "Add",
                    tabBarIcon: ({ color }) => <Ionicons name="add-circle-outline" size={28} color={color} />,
                }}
            />
            <Tabs.Screen
                name="summary/index"
                options={{
                    headerTitle: "Summary",
                    title: "Summary",
                    tabBarIcon: ({ color }) => <Ionicons name="bar-chart-outline" size={28} color={color} />,
                }} 
            />
            <Tabs.Screen
                name="menu/index"
                options={{
                    headerTitle: "Menu",
                    title: "Menu",
                    tabBarIcon: ({ color }) => <Ionicons name="menu-sharp" size={28} color={color} />,
                }} 
            />
        </Tabs>
    )
}

export default TabsLayout