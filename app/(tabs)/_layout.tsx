// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'
import { FontAwesome, AntDesign, Feather } from '@expo/vector-icons'
import { TouchableOpacity, View } from 'react-native'

const TabsLayout = () => {
    return (
        <Tabs screenOptions={{
            tabBarInactiveTintColor: 'black',
            tabBarActiveTintColor: '#467e26ff',
            tabBarStyle: { backgroundColor: '#BCD9A2' },
            headerTitleAlign: 'left',
            headerTitleStyle: { fontSize: 20 },
            headerStyle: { backgroundColor: '#BCD9A2' },
            headerTintColor: 'black',
        }}>
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
                    headerRight: () => (
                        <View style={{ marginRight: 10 }}>
                            <TouchableOpacity>
                                <FontAwesome name="user-circle-o" size={28} color="black" />
                            </TouchableOpacity>
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