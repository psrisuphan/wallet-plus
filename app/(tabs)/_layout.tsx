// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'
import { FontAwesome, AntDesign, Feather } from '@expo/vector-icons'
import { View } from 'react-native'

const TabsLayout = () => {
    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: 'blue', headerTitleAlign: 'left', headerTitleStyle: { fontSize: 20 } }}>
            <Tabs.Screen
                name="index"
                options={{
                    headerTitle: "Today",
                    title: "Home",
                    tabBarIcon: ({ color }) => <FontAwesome size={28} name="home" color={color} />,
                    headerLeft: () => (
                        <View style={{ marginLeft: 10 }}>
                            <Feather name="calendar" size={28} color="black" />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="new_transaction/index"
                options={{
                    headerTitle: "Add Transaction",
                    title: "New Transaction",
                    tabBarIcon: ({ color }) => <AntDesign size={28} name="plus-circle" color={color} />,
                }}
            />
            <Tabs.Screen
                name="statistic/index"
                options={{
                    headerTitle: "Statistics",
                    title: "Stats",
                    tabBarIcon: ({ color }) => <AntDesign size={28} name="bar-chart" color={color} />,
                    headerLeft: () => (
                        <View style={{ marginLeft: 10 }}>
                            <AntDesign size={28} name="bar-chart" color={'black'} />
                        </View>
                    ),
                }} />
        </Tabs>
    )
}

export default TabsLayout