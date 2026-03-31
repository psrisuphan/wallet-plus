// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { View } from 'react-native'

const TabsLayout = () => {
    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#699e8aff',
            tabBarInactiveTintColor: '#888',
            tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: '500',
            },
            tabBarStyle: { 
                backgroundColor: '#FFFFFF',
                height: 90,
                paddingBottom: 30,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: '#F0F0F0',
                elevation: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
            },
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: "Overview",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "cash" : "cash-outline"} size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="wallet/index"
                options={{
                    title: "Wallets",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "wallet" : "wallet-outline"} size={24} color={color} />
                    )
                }}
            />
            <Tabs.Screen
                name="new_transaction/index"
                options={{
                    title: "Add",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "add-circle" : "add-circle-outline"} size={28} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="summary/index"
                options={{
                    title: "Summary",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "bar-chart" : "bar-chart-outline"} size={24} color={color} />
                    ),
                }} 
            />
            <Tabs.Screen
                name="menu/index"
                options={{
                    title: "Menu",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "menu" : "menu-outline"} size={24} color={color} />
                    ),
                }} 
            />
        </Tabs>
    )
}

export default TabsLayout