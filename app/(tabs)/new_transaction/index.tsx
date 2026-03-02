// app/(tabs)/tab_2/index.js
import { Text, StyleSheet, View } from 'react-native'

const index = () => {
    return (
        <View style={styles.container}>
            <Text>Tab 2</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FEFFD3',
    },
})

export default index

