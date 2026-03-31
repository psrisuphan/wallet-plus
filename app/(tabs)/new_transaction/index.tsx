// app/(tabs)/tab_2/index.js
import { Text, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const index = () => {
    return (
        <SafeAreaView style={styles.container}>
            <Text>Tab 2</Text>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
})

export default index

