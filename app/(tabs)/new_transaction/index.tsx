import React from 'react';
import { StyleSheet, Text, View, StatusBar } from 'react-native';
import Header from '../../../components/Header';

const index = () => {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <Header title="Add Transaction" showHome={true} />
            <View style={styles.content}>
                <Text style={styles.text}>New Transaction Content Here</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 18,
        color: '#555',
    }
})

export default index

